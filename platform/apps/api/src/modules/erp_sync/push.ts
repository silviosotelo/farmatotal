/**
 * Push de pedidos al ERP vía el adapter activo (gateado por config del módulo erp_sync).
 * Lo invoca un hook (order.created/order.paid). Carga order+lines+branch y delega en
 * el adapter configurado; si éste no soporta pushOrder, usa el adapter Farmatotal por
 * defecto (que envuelve el push existente). Nunca lanza; deja traza en order.events.
 */
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { orders, orderLines, branches, settings } from "../../db/schema";
import { getAdapter } from "./adapters/types.js";
import { farmatotalAdapter } from "./adapters/farmatotal.js";

export async function erpPushOrder(tenantId: string, orderId: string) {
  const [cfgRow] = await db
    .select()
    .from(settings)
    .where(and(eq(settings.tenantId, tenantId), eq(settings.key, "plugin_erp_sync")))
    .limit(1);
  const config = (cfgRow?.value as Record<string, unknown>) ?? {};
  if (!config.pushOrders) return; // push de pedidos desactivado en la config

  const adapter = getAdapter(String(config.adapter ?? "")) ?? farmatotalAdapter;
  if (!adapter.pushOrder) return; // el adapter activo no empuja pedidos

  const [o] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o) return;
  const lines = await db.select().from(orderLines).where(eq(orderLines.orderId, o.id));
  const branch = o.branchId
    ? (await db.select().from(branches).where(eq(branches.id, o.branchId)).limit(1))[0]
    : null;

  let event: { at: string; type: string; note?: string };
  try {
    await adapter.pushOrder({ order: o, lines, branch: branch ?? null }, { tenantId, config });
    event = { at: new Date().toISOString(), type: "erp:sent", note: `via ${adapter.key}` };
  } catch (e) {
    event = { at: new Date().toISOString(), type: "erp:error", note: String(e).slice(0, 200) };
  }
  await db
    .update(orders)
    .set({ events: [...(o.events ?? []), event], updatedAt: new Date() })
    .where(eq(orders.id, o.id));
}
