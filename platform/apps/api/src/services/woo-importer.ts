/**
 * Importer de WooCommerce Store API → catalogo nativo.
 * No requiere auth (la Store API es publica para lectura).
 *
 * Idempotente: usa erpId como clave de upsert.
 */
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { productImages, products, syncRuns, tenants } from "../db/schema";

const SOURCE = "woo";
const BASE = "https://www.farmatotal.com.py/wp-json/wc/store/v1";
const UA = "FarmatotalImporter/0.1";

type WooImage = { src: string; alt?: string };
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
      tenantId,
      type: "wc_products_full",
      direction: "in",
      status: "running",
      metadata: { triggeredBy },
    })
    .returning({ id: syncRuns.id });
  const runId = run!.id;

  const stats = { productsSeen: 0, productsUpserted: 0, imagesUpserted: 0, errors: 0 };

  try {
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
          await upsertProduct(p, tenantId);
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
      .set({ status: "ok", completedAt: new Date(), metadata: { ...stats, triggeredBy } })
      .where(eq(syncRuns.id, runId));

    console.log("[woo] DONE", stats);
    return stats;
  } catch (e) {
    await db
      .update(syncRuns)
      .set({
        status: "failed",
        completedAt: new Date(),
        metadata: { ...stats, error: (e as Error).message, triggeredBy },
      })
      .where(eq(syncRuns.id, runId));
    throw e;
  }
}

async function upsertProduct(p: WooProduct, tenantId: string) {
  const sku = p.sku?.trim() || `woo-${p.id}`;
  const regularPrice = parsePrice(p.prices.regular_price, p.prices.currency_minor_unit);
  const priceSale = parsePrice(p.prices.sale_price, p.prices.currency_minor_unit);
  const salePrice = priceSale > 0 ? priceSale : regularPrice;

  const values = {
    tenantId,
    sku,
    barcode: null as string | null,
    regularPrice: String(regularPrice),
    salePrice: String(salePrice),
    erpId: String(p.id),
    erpSyncedAt: new Date(),
    erpSyncVersion: 1,
    status: "published" as const,
  };

  const [existing] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.tenantId, tenantId), eq(products.erpId, values.erpId)))
    .limit(1);

  let row: { id: string } | undefined;
  if (existing) {
    const [updated] = await db
      .update(products)
      .set({
        sku: values.sku,
        regularPrice: values.regularPrice,
        salePrice: values.salePrice,
        erpSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(products.id, existing.id))
      .returning({ id: products.id });
    row = updated;
  } else {
    const [inserted] = await db
      .insert(products)
      .values(values)
      .returning({ id: products.id });
    row = inserted;
  }
  if (!row) return;

  // Imagenes — replace all
  await db.delete(productImages).where(eq(productImages.productId, row.id));
  if (p.images?.length) {
    await db.insert(productImages).values(
      p.images.slice(0, 10).map((img, i) => ({
        tenantId,
        productId: row.id,
        mediaId: "00000000-0000-0000-0000-000000000000" as string,
        altText: img.alt ?? "",
        sortOrder: i,
      })),
    );
  }
}
