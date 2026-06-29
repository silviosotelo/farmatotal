/**
 * Mapper genérico ERP→plataforma. Aplica el mapeo configurable (erp_field_mappings)
 * a un registro crudo del ERP y separa los campos nativos de los custom (target con
 * prefijo "custom." va a la columna custom jsonb). Soporta transforms simples.
 */
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { erpFieldMappings } from "../../db/schema";
import type { RawRecord } from "./adapters/types.js";

export type FieldMapping = { sourceName: string; targetName: string; transform?: string | null };

export async function loadMappings(tenantId: string, entity: string): Promise<FieldMapping[]> {
  const rows = await db
    .select({ sourceName: erpFieldMappings.erpField, targetName: erpFieldMappings.platformField, transform: erpFieldMappings.transform })
    .from(erpFieldMappings)
    .where(and(eq(erpFieldMappings.tenantId, tenantId), eq(erpFieldMappings.entityType, entity)));
  return rows.map((r) => ({
    sourceName: r.sourceName,
    targetName: r.targetName,
    transform: r.transform as string | null,
  }));
}

function applyTransform(value: unknown, transform?: string | null): unknown {
  if (value == null || !transform) return value;
  const s = String(value);
  switch (transform) {
    case "number": return Number(s.replace(",", ".")) || 0;
    case "boolean": return /^(1|true|si|sí|yes|s)$/i.test(s.trim());
    case "upper": return s.toUpperCase();
    case "lower": return s.toLowerCase();
    case "trim": return s.trim();
    case "slug": return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    default: return value;
  }
}

/**
 * Transforma un registro crudo en {fields nativos, custom}. `targetName` con prefijo
 * "custom." (ej. "custom.principio_activo") va al jsonb custom; el resto es columna nativa.
 */
export function mapRecord(raw: RawRecord, mappings: FieldMapping[]): { fields: Record<string, unknown>; custom: Record<string, unknown> } {
  const fields: Record<string, unknown> = {};
  const custom: Record<string, unknown> = {};
  for (const m of mappings) {
    if (!(m.sourceName in raw)) continue;
    const val = applyTransform(raw[m.sourceName], m.transform);
    if (val === undefined) continue;
    if (m.targetName.startsWith("custom.")) custom[m.targetName.slice(7)] = val;
    else fields[m.targetName] = val;
  }
  return { fields, custom };
}
