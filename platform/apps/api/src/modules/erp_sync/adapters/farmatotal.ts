/**
 * Adapter del ERP Farmatotal (Cybersource/REST). Envuelve los servicios existentes
 * services/erp.ts (push de pedidos) y services/erp-stock.ts (stock en vivo).
 * Importación de productos: el catálogo Farmatotal hoy entra vía WooCommerce
 * (ver WooAdapter), así que este adapter no implementa importProducts.
 */
import { pushOrderToErp } from "../../../services/erp.js";
import { queryErpStock } from "../../../services/erp-stock.js";
import type { AdapterCtx, ErpAdapter, OrderPushInput } from "./types.js";

export const farmatotalAdapter: ErpAdapter = {
  key: "farmatotal",
  label: "ERP Farmatotal (Cybersource/REST)",

  async pushOrder(input: OrderPushInput) {
    // Reutiliza el push existente (payload ECO_*). Tipos laxos → cast a los del servicio.
    await pushOrderToErp(input.order as never, input.lines as never, (input.branch ?? null) as never);
  },

  async fetchStock(skus: string[], branchErpCode: string | null, _ctx: AdapterCtx) {
    const out: Record<string, number> = {};
    if (!branchErpCode) return out;
    // Consulta secuencial por SKU (el endpoint es por artículo). Tolerante a fallos.
    for (const sku of skus) {
      try {
        const r = await queryErpStock(branchErpCode, sku, 1);
        const qty = (r as { stock?: number; cantidad?: number; STK_CANTIDAD?: number }).stock
          ?? (r as { cantidad?: number }).cantidad
          ?? (r as { STK_CANTIDAD?: number }).STK_CANTIDAD;
        if (typeof qty === "number") out[sku] = qty;
      } catch {
        /* ignora el SKU que falle */
      }
    }
    return out;
  },
};
