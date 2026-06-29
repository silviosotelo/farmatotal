/**
 * Importer WooCommerce REST (wc/v3) → catálogo nativo.
 * A diferencia de la Store API (recortada), wc/v3 trae `meta_data` con los campos
 * reales del maestro: cod_interno, ind_controlado(receta), ind_destacado(featured),
 * porc_dcto, cod_promocion, ind_ecommerce + precios normal/web reales.
 *
 * Claves read-only en FARMATOTAL/_recon/wc-rest-new.txt (formato `ck|cs`). ⚠️ rotar tras migrar.
 * Idempotente por erpId (woo_id).
 * Uso: NODE_TLS_REJECT_UNAUTHORIZED=0 tsx src/scripts/import-wc-rest.ts [MAX]
 */
import fs from "node:fs";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client";
import { productImages, products, syncRuns, tenants } from "../db/schema";

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

async function main() {
  const MAX = Number(process.argv[2] || 2000);
  const tenantSlug = process.env.DEFAULT_TENANT ?? "default";
  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, tenantSlug))
    .limit(1);
  if (!tenant) throw new Error(`Tenant '${tenantSlug}' no existe`);
  const tenantId = tenant.id;
  const [run] = await db.insert(syncRuns).values({ tenantId, type: "wc_rest", direction: "in", status: "running" }).returning({ id: syncRuns.id });
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
          const regularPrice = toInt(p.regular_price) || toInt(p.price);
          const saleP = toInt(p.sale_price);
          const salePrice = p.on_sale && saleP > 0 && saleP < regularPrice ? saleP : regularPrice;

          const values = {
            tenantId,
            sku: (p.sku || `woo-${p.id}`).trim(),
            barcode: null as string | null,
            regularPrice: String(regularPrice),
            salePrice: String(salePrice),
            featured: isFeat,
            status: "published" as const,
            erpId: String(p.id),
            erpSyncedAt: new Date(),
            erpSyncVersion: 1,
          };
          const [existingProd] = await db
            .select({ id: products.id })
            .from(products)
            .where(and(eq(products.tenantId, tenantId), eq(products.erpId, values.erpId)))
            .limit(1);

          let row: { id: string } | undefined;
          if (existingProd) {
            const [updated] = await db
              .update(products)
              .set({
                sku: values.sku, regularPrice: values.regularPrice, salePrice: values.salePrice,
                featured: values.featured, erpSyncedAt: new Date(), updatedAt: new Date(),
              })
              .where(eq(products.id, existingProd.id))
              .returning({ id: products.id });
            row = updated;
          } else {
            const [inserted] = await db
              .insert(products)
              .values(values)
              .returning({ id: products.id });
            row = inserted;
          }
          if (row && p.images?.length) {
            await db.delete(productImages).where(eq(productImages.productId, row.id));
            await db.insert(productImages).values(
              p.images.slice(0, 8).map((img, i) => ({
                tenantId,
                productId: row.id,
                mediaId: "00000000-0000-0000-0000-000000000000" as string,
                altText: img.alt ?? "",
                sortOrder: i,
              })),
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
    await db.update(syncRuns).set({ status: "ok", completedAt: new Date(), metadata: { done, withCod, controlled, featured } }).where(eq(syncRuns.id, run!.id));
    console.log(`[wc] DONE: ${done} productos, cod_interno ${withCod}, receta ${controlled}, destacados ${featured}`);
  } catch (e) {
    await db.update(syncRuns).set({ status: "failed", completedAt: new Date(), metadata: { error: (e as Error).message } }).where(eq(syncRuns.id, run!.id));
    throw e;
  }
  process.exit(0);
}
main().catch((e) => { console.error("FAIL", e); process.exit(1); });
