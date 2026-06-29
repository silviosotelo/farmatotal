/**
 * Import genérico dirigido por mapeo (agnóstico): toma RawRecord[] de un adapter,
 * aplica el mapeo configurable (erp_field_mappings) y upsertea idempotente por
 * (tenantId, erpId). Soporta productos. Registra la corrida en syncRuns/syncErrors.
 */
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { products, syncRuns, syncErrors } from "../../db/schema";
import { loadMappings, mapRecord } from "./mapper.js";
import type { RawRecord } from "./adapters/types.js";

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 240);

// Columnas nativas permitidas para productos (el resto del mapeo va a product_meta).
const PRODUCT_COLS = new Set(["sku", "barcode", "regularPrice", "salePrice", "erpId"]);

function pick(fields: Record<string, unknown>, allowed: Set<string>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) if (allowed.has(k)) out[k] = v;
  return out;
}

export async function importEntity(
  tenantId: string,
  entity: "products",
  sourceSystem: string,
  records: RawRecord[],
  triggeredBy = "erp_sync",
): Promise<{ imported: number; errors: number; runId: string }> {
  const mappings = await loadMappings(tenantId, entity === "products" ? "product" : "category");
  const [run] = await db
    .insert(syncRuns)
    .values({ tenantId, type: "erp_products", direction: "in", status: "running", metadata: { triggeredBy } })
    .returning();
  let imported = 0;
  let errors = 0;

  for (const raw of records) {
    try {
      const { fields, custom } = mapRecord(raw, mappings);
      const erpId = fields.erpId != null ? String(fields.erpId) : "";
      if (!erpId) { errors++; await db.insert(syncErrors).values({ tenantId, syncRunId: run!.id, entityType: "product", errorMessage: "sin erpId mapeado", payload: raw }); continue; }

      if (entity === "products") {
        const nat = pick(fields, PRODUCT_COLS);
        const sku = String(nat.sku ?? erpId).trim();
        const regularPrice = Number(nat.regularPrice ?? 0) || 0;
        const salePrice = Number(nat.salePrice ?? regularPrice) || regularPrice;
        const values = {
          tenantId, sku,
          erpId,
          barcode: nat.barcode != null ? String(nat.barcode) : null,
          regularPrice: String(regularPrice),
          salePrice: String(salePrice),
        };
        const [existingProd] = await db.select({ id: products.id }).from(products)
          .where(and(eq(products.tenantId, tenantId), eq(products.erpId, erpId)))
          .limit(1);
        if (existingProd) {
          await db.update(products).set({ sku: values.sku, barcode: values.barcode, regularPrice: values.regularPrice, salePrice: values.salePrice, updatedAt: new Date() })
            .where(eq(products.id, existingProd.id));
        } else {
          await db.insert(products).values(values);
        }
      }
      imported++;
    } catch (e) {
        errors++;
        await db.insert(syncErrors).values({ tenantId, syncRunId: run!.id, entityType: entity, errorMessage: String(e).slice(0, 500), payload: raw });
    }
  }

  await db.update(syncRuns).set({ status: errors && !imported ? "failed" : "ok", completedAt: new Date(), metadata: { imported, errors, total: records.length, sourceSystem } }).where(eq(syncRuns.id, run!.id));
  return { imported, errors, runId: run!.id };
}
