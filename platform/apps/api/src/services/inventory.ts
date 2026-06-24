/**
 * Descuento de stock por sucursal al confirmar una orden (multi-inventory).
 * Fuente de verdad: tabla `inventory` (producto, sucursal). `products.stockCached`
 * se recalcula como la suma por producto. Idempotente vía un evento en la orden.
 *
 * Selección de la sucursal que descuenta:
 *  - Retiro (pickup): la sucursal elegida (order.branchId).
 *  - Delivery: la sucursal con delivery habilitado MÁS CERCANA a la ubicación del
 *    cliente (lat/lng en shippingAddress); si no hay ubicación, la que tenga más stock.
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { branches, inventory, orderLines, orders, products } from "../db/schema";

const STOCK_EVENT = "stock_decremented";

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Extrae {lat,lng} de shippingAddress, tolerando varias formas. */
function locOf(addr: Record<string, unknown> | null | undefined): { lat: number; lng: number } | null {
  if (!addr) return null;
  const l = (addr.location ?? addr) as Record<string, unknown>;
  const lat = Number(l.lat ?? l.latitude);
  const lng = Number(l.lng ?? l.lng ?? l.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

/**
 * Descuenta el stock de las líneas de una orden, una sola vez. Devuelve la sucursal
 * usada y un detalle por línea. No lanza si falta stock (clamp a 0) — registra el faltante.
 */
export async function decrementOrderStock(orderId: string): Promise<{ ok: boolean; reason?: string; branchId?: string }> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return { ok: false, reason: "order_not_found" };
  // Idempotencia: si ya se descontó, no repetir.
  if ((order.events ?? []).some((e) => e.type === STOCK_EVENT)) return { ok: true, reason: "already_done" };

  const lines = await db.select().from(orderLines).where(eq(orderLines.orderId, orderId));
  const withProduct = lines.filter((l) => l.productId);
  if (withProduct.length === 0) {
    await markDone(order, null, "sin productos con id");
    return { ok: true, reason: "no_products" };
  }

  const branchId = await resolveSourceBranch(order, withProduct.map((l) => l.productId as string));
  if (!branchId) {
    await markDone(order, null, "sin sucursal/stock para descontar");
    return { ok: true, reason: "no_branch" };
  }

  const detail: string[] = [];
  for (const l of withProduct) {
    const pid = l.productId as string;
    const qty = Math.ceil(l.quantity);
    await db
      .update(inventory)
      .set({ stock: sql`GREATEST(0, ${inventory.stock} - ${qty})`, updatedAt: new Date() })
      .where(and(eq(inventory.productId, pid), eq(inventory.branchId, branchId)));
    const [{ total } = { total: 0 }] = await db
      .select({ total: sql<number>`coalesce(sum(${inventory.stock}),0)::int` })
      .from(inventory)
      .where(and(eq(inventory.tenantId, order.tenantId), eq(inventory.productId, pid)));
    await db.update(products).set({ stockCached: total }).where(eq(products.id, pid));
    detail.push(`${l.sku}-${qty}`);
  }
  await markDone(order, branchId, detail.join(", "));
  return { ok: true, branchId };
}

async function markDone(order: typeof orders.$inferSelect, branchId: string | null, note: string) {
  const events = [
    ...(order.events ?? []),
    { at: new Date().toISOString(), type: STOCK_EVENT, by: branchId ?? "system", note },
  ];
  await db.update(orders).set({ events, updatedAt: new Date() }).where(eq(orders.id, order.id));
}

/** Elige la sucursal de origen del descuento según el método de entrega. */
async function resolveSourceBranch(order: typeof orders.$inferSelect, productIds: string[]): Promise<string | null> {
  if (order.branchId) return order.branchId; // retiro o sucursal ya asignada

  const list = await db
    .select()
    .from(branches)
    .where(and(eq(branches.tenantId, order.tenantId), eq(branches.active, true)));
  if (list.length === 0) return null;

  // Delivery con ubicación → sucursal con delivery habilitado más cercana.
  const loc = locOf(order.shippingAddress);
  const candidates = list.filter((b) => (order.shippingMethod === "delivery" ? b.deliveryEnabled : true));
  const pool = candidates.length ? candidates : list;
  if (loc) {
    const withCoords = pool.filter((b) => b.lat != null && b.lng != null);
    if (withCoords.length) {
      withCoords.sort((a, b) => haversineKm(loc.lat, loc.lng, a.lat!, a.lng!) - haversineKm(loc.lat, loc.lng, b.lat!, b.lng!));
      return withCoords[0]!.id;
    }
  }
  // Sin ubicación: la sucursal con más stock total de los productos del pedido.
  const stocks = await db
    .select({ branchId: inventory.branchId, total: sql<number>`coalesce(sum(${inventory.stock}),0)::int` })
    .from(inventory)
    .where(and(eq(inventory.tenantId, order.tenantId), inArray(inventory.productId, productIds)))
    .groupBy(inventory.branchId);
  const poolIds = new Set(pool.map((b) => b.id));
  const best = stocks.filter((s) => poolIds.has(s.branchId)).sort((a, b) => b.total - a.total)[0];
  return best?.branchId ?? pool[0]!.id;
}
