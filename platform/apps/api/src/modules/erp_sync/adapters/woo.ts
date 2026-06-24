/**
 * Adapter WooCommerce. Envuelve el importador existente services/woo-importer.ts,
 * que ya mapea + upserta categorías y productos de forma idempotente (sourceSystem='woo',
 * sourceId=woo_id) y registra la corrida en syncRuns. Por eso importProducts hace la
 * importación completa internamente y devuelve [] (no usa el mapper genérico).
 */
import { runFullWooImport } from "../../../services/woo-importer.js";
import type { AdapterCtx, ErpAdapter, RawRecord } from "./types.js";

export const wooAdapter: ErpAdapter = {
  key: "woo",
  label: "WooCommerce",

  async importProducts(ctx: AdapterCtx): Promise<RawRecord[]> {
    // runFullWooImport importa categorías + productos y los upserta directamente.
    const max = Number(ctx.config.maxProducts) || undefined;
    await runFullWooImport({ triggeredBy: `erp_sync:${ctx.tenantId}`, maxProducts: max });
    return []; // ya upserteado por el importador (no pasa por el mapper genérico)
  },
};
