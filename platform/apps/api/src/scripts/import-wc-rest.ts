/**
 * Importer WooCommerce REST (wc/v3) → catálogo nativo.
 * A diferencia de la Store API (recortada), wc/v3 trae `meta_data` con los campos
 * reales del maestro: cod_interno, ind_controlado(receta), ind_destacado(featured),
 * porc_dcto, cod_promocion, ind_ecommerce + precios normal/web reales.
 *
 * Claves read-only en FARMATOTAL/_recon/wc-rest-new.txt (formato `ck|cs`). ⚠️ rotar tras migrar.
 * Idempotente por (sourceSystem='woo', sourceId=woo_id).
 * Uso: NODE_TLS_REJECT_UNAUTHORIZED=0 tsx src/scripts/import-wc-rest.ts [MAX]
 */
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { categories, productImages, products, syncRuns } from "../db/schema";

const KEYS_FILE = "C:/Users/sotelos/FARMATOTAL/_recon/wc-rest-new.txt";
const BASE = "https://www.farmatotal.com.py/wp-json/wc/v3";
const UA = "FarmatotalWcRest/0.1";

type WcMeta = { key: string; value: unknown };
type WcProduct = {
  id: number;
  sku: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  status: string;
  on_sale: boolean;
  prices?: unknown;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  categories?: { id: number; name: string; slug: string }[];
  images?: { src: string; alt?: string }[];
  meta_data?: WcMeta[];
};

function auth(): string {
  const raw = fs.readFileSync(KEYS_FILE, "utf8").trim().split("|");
  return "Basic " + Buffer.from(`${raw[0]}:${raw[1]}`).toString("base64");
}

async function http<T>(p: string): Promise<T> {
  const res = await fetch(`${BASE}${p}`, { headers: { "User-Agent": UA, Authorization: auth(), Accept: "application/json" } });
  if (!res.ok) throw new Error(`wc ${res.status} ${p}: ${(await res.text()).slice(0, 150)}`);
  return (await res.json()) as T;
}

const stripHtml = (s?: string) => (s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 4000);
const metaOf = (p: WcProduct, k: string) => {
  const m = p.meta_data?.find((x) => x.key === k);
  return m ? String(m.value ?? "") : "";
};
const toInt = (s?: string) => Math.round(parseFloat(s || "0")) || 0;

async function catSlugMap(): Promise<Map<string, string>> {
  const rows = await db.select({ id: categories.id, slug: categories.slug }).from(categories);
  return new Map(rows.map((r) => [r.slug, r.id]));
}

async function main() {
  const MAX = Number(process.argv[2] || 2000);
  const slugToCat = await catSlugMap();
  const [run] = await db.insert(syncRuns).values({ kind: "wc-rest", status: "running", startedAt: new Date() }).returning({ id: syncRuns.id });
  let done = 0, withCod = 0, controlled = 0, featured = 0, page = 1;
  try {
    while (done < MAX) {
      const batch = await http<WcProduct[]>(`/products?per_page=100&page=${page}&status=publish&_fields=id,sku,name,slug,description,short_description,status,on_sale,regular_price,sale_price,price,categories,images,meta_data`);
      if (!batch.length) break;
      for (const p of batch) {
        if (done >= MAX) break;
        try {
          const codInterno = metaOf(p, "cod_interno") || null;
          const isCtrl = metaOf(p, "ind_controlado").toUpperCase() === "S";
          const isFeat = metaOf(p, "ind_destacado").toUpperCase() === "S";
          const promoCode = (metaOf(p, "cod_promocion") || "").replace(/^0$/, "") || null;
          const priceNormal = toInt(p.regular_price) || toInt(p.price);
          const saleP = toInt(p.sale_price);
          const priceWeb = p.on_sale && saleP > 0 && saleP < priceNormal ? saleP : priceNormal;
          const catSlug = p.categories?.[0]?.slug;
          const categoryId = (catSlug && slugToCat.get(catSlug)) || null;
          const custom = {
            porc_dcto: metaOf(p, "porc_dcto") || null,
            ind_ecommerce: metaOf(p, "ind_ecommerce") || null,
            fecha_sincronizacion: metaOf(p, "fecha_sincronizacion") || null,
          };
          const slug = (p.slug || `woo-${p.id}`).slice(0, 240);
          const values = {
            sku: (p.sku || `woo-${p.id}`).trim(),
            codInterno,
            slug,
            title: p.name,
            description: stripHtml(p.description || p.short_description),
            categoryId,
            priceNormal,
            priceWeb,
            onPromo: !!(p.on_sale && priceWeb < priceNormal),
            promoCode,
            controlled: isCtrl,
            featured: isFeat,
            status: "published" as const,
            stockCached: 0,
            custom,
            erpSourced: true,
            sourceSystem: "woo",
            sourceId: String(p.id),
            syncedAt: new Date(),
          };
          const [row] = await db
            .insert(products)
            .values(values)
            .onConflictDoUpdate({
              target: [products.sourceSystem, products.sourceId],
              set: {
                sku: values.sku, codInterno, slug: values.slug, title: values.title,
                description: values.description, categoryId, priceNormal, priceWeb,
                onPromo: values.onPromo, promoCode, controlled: isCtrl, featured: isFeat,
                custom, erpSourced: true, syncedAt: new Date(), updatedAt: new Date(),
              },
            })
            .returning({ id: products.id });
          if (row && p.images?.length) {
            await db.delete(productImages).where(eq(productImages.productId, row.id));
            await db.insert(productImages).values(
              p.images.slice(0, 8).map((img, i) => ({ productId: row.id, url: img.src, alt: img.alt ?? null, position: i, isPrimary: i === 0 })),
            );
          }
          done++;
          if (codInterno) withCod++;
          if (isCtrl) controlled++;
          if (isFeat) featured++;
        } catch (e) {
          console.error(`[wc] err id=${p.id} sku=${p.sku}: ${(e as Error).message}`);
        }
      }
      console.log(`[wc] pág ${page} — ${done} prods (cod_interno: ${withCod}, receta: ${controlled}, destacados: ${featured})`);
      page++;
    }
    await db.update(syncRuns).set({ status: "ok", finishedAt: new Date(), stats: { done, withCod, controlled, featured } }).where(eq(syncRuns.id, run!.id));
    console.log(`[wc] DONE: ${done} productos, cod_interno ${withCod}, receta ${controlled}, destacados ${featured}`);
  } catch (e) {
    await db.update(syncRuns).set({ status: "failed", finishedAt: new Date(), stats: { error: (e as Error).message } }).where(eq(syncRuns.id, run!.id));
    throw e;
  }
  process.exit(0);
}
main().catch((e) => { console.error("FAIL", e); process.exit(1); });
