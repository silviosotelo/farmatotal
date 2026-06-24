/**
 * Import genérico dirigido por mapeo (agnóstico): toma RawRecord[] de un adapter,
 * aplica el mapeo configurable (erp_field_mappings) y upsertea idempotente por
 * (tenantId, sourceSystem, sourceId). Soporta productos y categorías, incluyendo
 * campos custom (jsonb). Registra la corrida en syncRuns/syncErrors.
 */
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { products, categories, syncRuns, syncErrors } from "../../db/schema";
import { loadMappings, mapRecord } from "./mapper.js";
import type { RawRecord } from "./adapters/types.js";

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 240);

// Columnas nativas permitidas por entidad (el resto del mapeo va a custom.<key>).
const PRODUCT_COLS = new Set(["sku", "slug", "title", "description", "priceNormal", "priceWeb", "codInterno", "barcode", "unit", "controlled", "sourceId"]);
const CATEGORY_COLS = new Set(["slug", "name", "description", "fliaCodigo", "icon", "sourceId"]);

function pick(fields: Record<string, unknown>, allowed: Set<string>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) if (allowed.has(k)) out[k] = v;
  return out;
}

export async function importEntity(
  tenantId: string,
  entity: "products" | "categories",
  sourceSystem: string,
  records: RawRecord[],
  triggeredBy = "erp_sync",
): Promise<{ imported: number; errors: number; runId: string }> {
  const mappings = await loadMappings(tenantId, entity === "products" ? "product" : "category");
  const [run] = await db
    .insert(syncRuns)
    .values({ kind: "erp.products", status: "running", startedAt: new Date(), triggeredBy })
    .returning();
  let imported = 0;
  let errors = 0;

  for (const raw of records) {
    try {
      const { fields, custom } = mapRecord(raw, mappings);
      const sourceId = fields.sourceId != null ? String(fields.sourceId) : "";
      if (!sourceId) { errors++; await db.insert(syncErrors).values({ runId: run!.id, error: "sin sourceId mapeado", payload: raw }); continue; }

      if (entity === "products") {
        const nat = pick(fields, PRODUCT_COLS);
        const title = String(nat.title ?? "").trim();
        const sku = String(nat.sku ?? sourceId).trim();
        if (!title) { errors++; await db.insert(syncErrors).values({ runId: run!.id, sourceId, error: "sin title mapeado", payload: raw }); continue; }
        const slug = String(nat.slug ?? "").trim() || slugify(title) || sku;
        const priceWeb = Number(nat.priceWeb ?? 0) || 0;
        const priceNormal = Number(nat.priceNormal ?? priceWeb) || priceWeb;
        const values = {
          tenantId, sku, slug, title,
          description: nat.description != null ? String(nat.description) : null,
          codInterno: nat.codInterno != null ? String(nat.codInterno) : null,
          barcode: nat.barcode != null ? String(nat.barcode) : null,
          unit: nat.unit != null ? String(nat.unit) : undefined,
          controlled: nat.controlled === true || nat.controlled === "true",
          priceNormal, priceWeb,
          custom: Object.keys(custom).length ? custom : null,
          sourceSystem, sourceId, erpSourced: true,
        };
        await db.insert(products).values(values).onConflictDoUpdate({
          target: [products.tenantId, products.sourceSystem, products.sourceId],
          set: { title, slug, description: values.description, codInterno: values.codInterno, barcode: values.barcode, priceNormal, priceWeb, custom: values.custom, updatedAt: new Date() },
        });
      } else {
        const nat = pick(fields, CATEGORY_COLS);
        const name = String(nat.name ?? "").trim();
        if (!name) { errors++; await db.insert(syncErrors).values({ runId: run!.id, sourceId, error: "sin name mapeado", payload: raw }); continue; }
        const slug = String(nat.slug ?? "").trim() || slugify(name);
        await db.insert(categories).values({
          tenantId, slug, name,
          description: nat.description != null ? String(nat.description) : null,
          fliaCodigo: nat.fliaCodigo != null ? String(nat.fliaCodigo) : null,
          icon: nat.icon != null ? String(nat.icon) : null,
          custom: Object.keys(custom).length ? custom : null,
          sourceSystem, sourceId, erpSourced: true,
        }).onConflictDoUpdate({
          target: [categories.tenantId, categories.slug],
          set: { name, description: nat.description != null ? String(nat.description) : null, custom: Object.keys(custom).length ? custom : null, updatedAt: new Date() },
        });
      }
      imported++;
    } catch (e) {
      errors++;
      await db.insert(syncErrors).values({ runId: run!.id, error: String(e).slice(0, 500), payload: raw });
    }
  }

  await db.update(syncRuns).set({ status: errors && !imported ? "failed" : "ok", finishedAt: new Date(), stats: { imported, errors, total: records.length } }).where(eq(syncRuns.id, run!.id));
  return { imported, errors, runId: run!.id };
}
