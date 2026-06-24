/**
 * Importer de WooCommerce Store API → catalogo nativo.
 * No requiere auth (la Store API es publica para lectura).
 *
 * Idempotente: usa (source_system='woo', source_id=woo_id) como clave.
 */
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { brands, categories, productImages, products, syncRuns, tenants } from "../db/schema";

const SOURCE = "woo";
const BASE = "https://www.farmatotal.com.py/wp-json/wc/store/v1";
const UA = "FarmatotalImporter/0.1";

type WooImage = { src: string; alt?: string };
type WooCategory = {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parent: number;
  count: number;
  image: { src: string } | null;
};
type WooPrices = {
  price: string;
  regular_price: string;
  sale_price: string;
  currency_minor_unit: number;
};
type WooProduct = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  description: string;
  short_description?: string;
  permalink: string;
  on_sale: boolean;
  is_in_stock: boolean;
  is_purchasable: boolean;
  is_on_backorder: boolean;
  variation: string;
  type: "simple" | "variable" | "grouped" | "external";
  prices: WooPrices;
  images: WooImage[];
  categories: { id: number; name: string; slug: string }[];
  tags: { id: number; name: string; slug: string }[];
  attributes: unknown[];
};

async function http<T>(path: string, init?: RequestInit): Promise<{ data: T; headers: Headers }> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { "User-Agent": UA, Accept: "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Woo ${res.status} ${path}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as T;
  return { data, headers: res.headers };
}

function parsePrice(raw: string | undefined, minorUnit: number): number {
  // Store API devuelve strings de enteros en minor units; PYG = 0 decimales pero la API igual envia minor_unit=2.
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return 0;
  if (minorUnit <= 0) return n;
  return Math.round(n / Math.pow(10, minorUnit));
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 240);
}

function stripHtml(s: string | undefined): string | null {
  if (!s) return null;
  const txt = s
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return txt.length > 0 ? txt.slice(0, 5000) : null;
}

// ============ CATEGORIES ============
async function importCategories(tenantId: string): Promise<{ ok: number; map: Map<number, string> }> {
  const map = new Map<number, string>(); // wooId -> ourUuid
  let page = 1;
  const perPage = 100;
  let totalPages = 1;
  let ok = 0;

  while (page <= totalPages) {
    const { data, headers } = await http<WooCategory[]>(
      `/products/categories?per_page=${perPage}&page=${page}`,
    );
    totalPages = Number(headers.get("x-wp-totalpages") ?? "1");

    for (const c of data) {
      const slug = c.slug || slugify(c.name);
      const seo = { title: c.name, description: stripHtml(c.description) ?? undefined };
      const [row] = await db
        .insert(categories)
        .values({
          tenantId,
          slug,
          name: c.name,
          description: stripHtml(c.description),
          seo,
          erpSourced: false,
          active: true,
        })
        .onConflictDoUpdate({
          target: [categories.tenantId, categories.slug],
          set: { name: c.name, description: stripHtml(c.description), updatedAt: new Date() },
        })
        .returning({ id: categories.id });
      if (row) {
        map.set(c.id, row.id);
        ok++;
      }
    }
    page++;
  }

  // Segunda pasada: setear parentId (solo despues de tener todas las categorias).
  // No hay column source_id en categories — lo hacemos via slug.
  // Simplificacion: dejamos parentId null para la primera version. (TODO Fase 2.)
  return { ok, map };
}

// ============ PRODUCTS ============
export async function runFullWooImport(opts: {
  maxProducts?: number;
  perPage?: number;
  startPage?: number;
  triggeredBy?: string;
}) {
  const perPage = opts.perPage ?? 100;
  const max = opts.maxProducts ?? 1500;
  const triggeredBy = opts.triggeredBy ?? "cli";

  const slug = process.env.DEFAULT_TENANT ?? "default";
  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);
  if (!tenant) throw new Error(`Tenant '${slug}' no existe`);
  const tenantId = tenant.id;

  const [run] = await db
    .insert(syncRuns)
    .values({
      kind: "wc.products.full",
      status: "running",
      startedAt: new Date(),
      triggeredBy,
    })
    .returning({ id: syncRuns.id });
  const runId = run!.id;

  const stats = { catsImported: 0, productsSeen: 0, productsUpserted: 0, imagesUpserted: 0, errors: 0 };

  try {
    console.log("[woo] importando categorias…");
    const { ok: catsOk, map: catMap } = await importCategories(tenantId);
    stats.catsImported = catsOk;
    console.log(`[woo] categorias OK: ${catsOk}`);

    let page = opts.startPage ?? 1;
    while (stats.productsUpserted < max) {
      const { data, headers } = await http<WooProduct[]>(
        `/products?per_page=${perPage}&page=${page}`,
      );
      const totalPages = Number(headers.get("x-wp-totalpages") ?? "1");
      stats.productsSeen += data.length;
      console.log(`[woo] pagina ${page}/${totalPages} (${data.length} productos)`);

      if (data.length === 0) break;

      for (const p of data) {
        if (stats.productsUpserted >= max) break;
        try {
          await upsertProduct(p, catMap, tenantId);
          stats.productsUpserted++;
          if (p.images?.length) stats.imagesUpserted += p.images.length;
        } catch (e) {
          stats.errors++;
          console.error(`[woo] error sku=${p.sku} id=${p.id}: ${(e as Error).message}`);
        }
      }
      page++;
      if (page > totalPages) break;
    }

    await db
      .update(syncRuns)
      .set({ status: "ok", finishedAt: new Date(), stats })
      .where(eq(syncRuns.id, runId));

    console.log("[woo] DONE", stats);
    return stats;
  } catch (e) {
    await db
      .update(syncRuns)
      .set({
        status: "failed",
        finishedAt: new Date(),
        stats,
        errorMessage: (e as Error).message,
      })
      .where(eq(syncRuns.id, runId));
    throw e;
  }
}

async function upsertProduct(p: WooProduct, catMap: Map<number, string>, tenantId: string) {
  const sku = p.sku?.trim() || `woo-${p.id}`;
  const slug = p.slug || slugify(p.name);
  const priceNormal = parsePrice(p.prices.regular_price, p.prices.currency_minor_unit);
  const priceSale = parsePrice(p.prices.sale_price, p.prices.currency_minor_unit);
  const priceWeb = priceSale > 0 ? priceSale : priceNormal;
  const onPromo = p.on_sale && priceSale > 0 && priceSale < priceNormal;

  const categoryId = p.categories?.[0] ? catMap.get(p.categories[0].id) ?? null : null;

  const custom: Record<string, unknown> = {
    woo_id: p.id,
    woo_permalink: p.permalink,
    woo_type: p.type,
    woo_in_stock: p.is_in_stock,
    woo_on_backorder: p.is_on_backorder,
    short_description: stripHtml(p.short_description),
    tags: p.tags?.map((t) => ({ id: t.id, name: t.name, slug: t.slug })) ?? [],
  };

  const values = {
    tenantId,
    sku,
    slug,
    title: p.name,
    description: stripHtml(p.description),
    categoryId: categoryId ?? null,
    priceNormal,
    priceWeb,
    onPromo,
    status: "published" as const,
    stockCached: p.is_in_stock ? 1 : 0,
    custom,
    erpSourced: false,
    sourceSystem: SOURCE,
    sourceId: String(p.id),
    syncedAt: new Date(),
  };

  const [row] = await db
    .insert(products)
    .values(values)
    .onConflictDoUpdate({
      target: [products.tenantId, products.sourceSystem, products.sourceId],
      set: {
        sku: values.sku,
        slug: values.slug,
        title: values.title,
        description: values.description,
        categoryId: values.categoryId,
        priceNormal: values.priceNormal,
        priceWeb: values.priceWeb,
        onPromo: values.onPromo,
        stockCached: values.stockCached,
        custom: values.custom,
        syncedAt: values.syncedAt,
        updatedAt: new Date(),
      },
    })
    .returning({ id: products.id });
  if (!row) return;

  // Imagenes — replace all
  await db.delete(productImages).where(eq(productImages.productId, row.id));
  if (p.images?.length) {
    await db.insert(productImages).values(
      p.images.slice(0, 10).map((img, i) => ({
        productId: row.id,
        url: img.src,
        alt: img.alt ?? null,
        position: i,
        isPrimary: i === 0,
      })),
    );
  }
}
