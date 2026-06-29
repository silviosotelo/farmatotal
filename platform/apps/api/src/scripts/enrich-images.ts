#!/usr/bin/env tsx
/**
 * Enricher de imágenes: para productos sin imagen, fetchea el detalle de la
 * WC Store API (/products/:id, donde woo_id está en erp_id) y baja todas
 * sus imágenes a product_images. Idempotente (replace-all por producto).
 *
 * Uso: NODE_TLS_REJECT_UNAUTHORIZED=0 pnpm exec tsx src/scripts/enrich-images.ts [MAX]
 */
import { eq, sql } from "drizzle-orm";
import { db, pool } from "../db/client";
import { productImages, products } from "../db/schema";

const BASE = "https://www.farmatotal.com.py/wp-json/wc/store/v1";
const UA = "FarmatotalImgEnricher/0.1";

type WooImage = { src: string; alt?: string };

async function fetchWoo(id: number): Promise<WooImage[]> {
  const res = await fetch(`${BASE}/products/${id}`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`woo ${res.status}`);
  const data = (await res.json()) as { images?: WooImage[] };
  return data.images ?? [];
}

async function main() {
  const max = Number(process.argv[2] ?? 2000);

  // Productos sin ninguna imagen, que tengan erp_id (woo_id) en la tabla products
  const rows = await db
    .select({ id: products.id, erpId: products.erpId, tenantId: products.tenantId })
    .from(products)
    .where(
      sql`not exists (select 1 from farmatotal_app.product_images pi where pi.product_id = ${products.id})
          and ${products.erpId} is not null`,
    )
    .limit(max);

  console.log(`[img] ${rows.length} productos sin imagen a procesar`);
  let done = 0,
    withImg = 0,
    imgs = 0,
    errors = 0;

  for (const r of rows) {
    const wooId = Number(r.erpId);
    if (!wooId) continue;
    try {
      const images = await fetchWoo(wooId);
      if (images.length > 0) {
        await db.delete(productImages).where(eq(productImages.productId, r.id));
        await db.insert(productImages).values(
          images.slice(0, 10).map((img, i) => ({
            tenantId: r.tenantId,
            productId: r.id,
            mediaId: "00000000-0000-0000-0000-000000000000" as string,
            altText: img.alt ?? "",
            sortOrder: i,
          })),
        );
        withImg++;
        imgs += Math.min(images.length, 10);
      }
      done++;
      if (done % 100 === 0) console.log(`[img] ${done}/${rows.length} (con img: ${withImg}, ${imgs} imgs)`);
    } catch (e) {
      errors++;
      if (errors <= 10) console.error(`[img] err woo=${wooId}: ${(e as Error).message}`);
    }
  }

  console.log(`[img] DONE done=${done} withImg=${withImg} imgs=${imgs} errors=${errors}`);
  await pool.end();
}

main().catch((e) => {
  console.error("[img] FAIL", e);
  process.exit(1);
});
