/**
 * Push de pedidos al ERP vía el adapter activo (gateado por config del módulo erp_sync).
 * Lo invoca un hook (order.created/order.paid). Carga order+lines+branch y delega en
 * el adapter configurado; si éste no soporta pushOrder, usa el adapter Farmatotal por
 * defecto (que envuelve el push existente). Nunca lanza; deja traza en order_timeline.
 */
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { orders, orderItems, branches, options } from "../../db/schema";
import { getAdapter } from "./adapters/types.js";
import { farmatotalAdapter } from "./adapters/farmatotal.js";

export async function erpPushOrder(tenantId: string, orderId: string) {
  const [cfgRow] = await db
    .select()
    .from(options)
    .where(and(eq(options.tenantId, tenantId), eq(options.name, "plugin_erp_sync")))
    .limit(1);
  const config = (cfgRow?.value as Record<string, unknown>) ?? {};
  if (!config.pushOrders) return;

  const adapter = getAdapter(String(config.adapter ?? "")) ?? farmatotalAdapter;
  if (!adapter.pushOrder) return;

  const [o] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o) return;
  const lines = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id));
  const branch = o.branchId
    ? (await db.select().from(branches).where(eq(branches.id, o.branchId)).limit(1))[0]
    : null;

  let eventType: string;
  let note: string;
  try {
    await adapter.pushOrder({ order: o, lines, branch: branch ?? null }, { tenantId, config });
    eventType = "erp:sent";
    note = `via ${adapter.key}`;
  } catch (e) {
    eventType = "erp:error";
    note = String(e).slice(0, 200);
  }
  // Store ERP push result as a timeline entry instead of events column
  const { orderTimeline } = await import("../../db/schema");
  await db.insert(orderTimeline).values({
    tenantId: o.tenantId,
    orderId: o.id,
    type: "system",
    visibility: "internal",
    message: `${eventType}: ${note}`,
    actorType: "system",
  });
}
