/**
 * Descuento de stock por sucursal al confirmar una orden (multi-inventory).
 * Fuente de verdad: tabla `inventory` (producto, sucursal).
 *
 * Selección de la sucursal que descuenta:
 *  - Retiro (pickup): la sucursal elegida (order.branchId).
 *  - Delivery: la sucursal más cercana a la dirección del pedido; si no hay ubicación,
 *    la que tenga más stock.
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { branches, inventory, inventoryMovements, orderItems, orders, products } from "../db/schema";

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Descuenta el stock de las líneas de una orden, una sola vez. Devuelve la sucursal
 * usada y un detalle por línea.
 */
export async function decrementOrderStock(orderId: string): Promise<{ ok: boolean; reason?: string; branchId?: string }> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return { ok: false, reason: "order_not_found" };

  const lines = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const withProduct = lines.filter((l) => l.productId);
  if (withProduct.length === 0) {
    return { ok: true, reason: "no_products" };
  }

  const branchId = await resolveSourceBranch(order, withProduct.map((l) => l.productId as string));
  if (!branchId) {
    return { ok: true, reason: "no_branch" };
  }

  const detail: string[] = [];
  for (const l of withProduct) {
    const pid = l.productId as string;
    const qty = Math.ceil(l.quantity);
    await db
      .update(inventory)
      .set({ onHand: sql`GREATEST(0, ${inventory.onHand} - ${qty})`, updatedAt: new Date() })
      .where(and(eq(inventory.productId, pid), eq(inventory.branchId, branchId)));
    const [{ total } = { total: 0 }] = await db
      .select({ total: sql<number>`coalesce(sum(${inventory.onHand}),0)::int` })
      .from(inventory)
      .where(and(eq(inventory.tenantId, order.tenantId), eq(inventory.productId, pid)));
    await db.update(products).set({ totalSales: total }).where(eq(products.id, pid));
    detail.push(`${l.sku}-${qty}`);
  }

  // Record the stock decrement event via inventory_movements
  for (const l of withProduct) {
    const pid = l.productId as string;
    const qty = Math.ceil(l.quantity);
    const [invRow] = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.productId, pid), eq(inventory.branchId, branchId)))
      .limit(1);
    if (invRow) {
      await db.insert(inventoryMovements).values({
        tenantId: order.tenantId,
        inventoryId: invRow.id,
        type: "sale",
        quantity: String(-qty),
        onHandBefore: invRow.onHand,
        onHandAfter: String(Number(invRow.onHand) - qty),
        referenceType: "order",
        referenceId: orderId,
      });
    }
  }

  return { ok: true, branchId };
}

/**
 * Restaura el stock de las líneas de una orden (cancelación o reembolso).
 */
export async function restoreOrderStockById(orderId: string, reason: 'cancel' | 'refund'): Promise<{ ok: boolean; reason?: string }> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return { ok: false, reason: "order_not_found" };

  const lines = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const withProduct = lines.filter((l) => l.productId);
  if (withProduct.length === 0) {
    return { ok: true, reason: "no_products" };
  }

  const branchId = order.branchId || await resolveSourceBranch(order, withProduct.map((l) => l.productId as string));
  if (!branchId) {
    return { ok: true, reason: "no_branch" };
  }

  const detail: string[] = [];
  for (const l of withProduct) {
    const pid = l.productId as string;
    const qty = Math.ceil(l.quantity);

    const [invRow] = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.productId, pid), eq(inventory.branchId, branchId)))
      .limit(1);
    const onHandBefore = invRow?.onHand ?? "0";

    await db
      .update(inventory)
      .set({ onHand: sql`${inventory.onHand} + ${qty}`, updatedAt: new Date() })
      .where(and(eq(inventory.productId, pid), eq(inventory.branchId, branchId)));

    if (invRow) {
      await db.insert(inventoryMovements).values({
        tenantId: order.tenantId,
        inventoryId: invRow.id,
        type: reason === 'cancel' ? 'return' : 'return',
        quantity: String(qty),
        onHandBefore,
        onHandAfter: String(Number(onHandBefore) + qty),
        referenceType: "order",
        referenceId: orderId,
        reason,
      });
    }

    const [{ total } = { total: 0 }] = await db
      .select({ total: sql<number>`coalesce(sum(${inventory.onHand}),0)::int` })
      .from(inventory)
      .where(and(eq(inventory.tenantId, order.tenantId), eq(inventory.productId, pid)));
    await db.update(products).set({ totalSales: total }).where(eq(products.id, pid));
    detail.push(`${l.sku}+${qty}`);
  }
  return { ok: true };
}

/** Elige la sucursal de origen del descuento según el método de entrega. */
async function resolveSourceBranch(order: typeof orders.$inferSelect, productIds: string[]): Promise<string | null> {
  if (order.branchId) return order.branchId;

  const list = await db
    .select()
    .from(branches)
    .where(and(eq(branches.tenantId, order.tenantId), eq(branches.status, "active")));
  if (list.length === 0) return null;

  const pool = list;
  const stocks = await db
    .select({ branchId: inventory.branchId, total: sql<number>`coalesce(sum(${inventory.onHand}),0)::int` })
    .from(inventory)
    .where(and(eq(inventory.tenantId, order.tenantId), inArray(inventory.productId, productIds)))
    .groupBy(inventory.branchId);
  const poolIds = new Set(pool.map((b) => b.id));
  const best = stocks.filter((s) => poolIds.has(s.branchId)).sort((a, b) => b.total - a.total)[0];
  return best?.branchId ?? pool[0]!.id;
}

/** Restaurar stock cuando se cancela un pedido */
export async function restoreOrderStock(order: {
  id: string
  branchId?: string
  lines: Array<{ productId: string; quantity: number }>
  tenantId: string
  reason: 'cancel' | 'refund' | 'manual'
}) {
  for (const line of order.lines) {
    if (!line.quantity) continue

    const [existing] = await db.select()
      .from(inventory)
      .where(and(
        eq(inventory.tenantId, order.tenantId),
        eq(inventory.productId, line.productId),
      ))
      .limit(1)

    const branchId = order.branchId || existing?.branchId || ''
    if (!branchId) continue

    const [row] = await db.select()
      .from(inventory)
      .where(and(
        eq(inventory.tenantId, order.tenantId),
        eq(inventory.productId, line.productId),
        eq(inventory.branchId, branchId),
      ))
      .limit(1)

    if (row) {
      const newOnHand = (Number(row.onHand) || 0) + line.quantity
      await db.update(inventory)
        .set({ onHand: String(newOnHand), updatedAt: new Date() })
        .where(and(
          eq(inventory.tenantId, order.tenantId),
          eq(inventory.productId, line.productId),
          eq(inventory.branchId, branchId),
        ))

      await db.insert(inventoryMovements).values({
        tenantId: order.tenantId,
        inventoryId: row.id,
        type: order.reason === 'cancel' ? 'return' as const : 'restock' as const,
        quantity: String(line.quantity),
        onHandBefore: row.onHand,
        onHandAfter: String(newOnHand),
        referenceType: "order",
        referenceId: order.id,
        reason: order.reason,
      })

      await updateProductCachedStock(order.tenantId, line.productId)
    }
  }
}

/** Registrar movimiento de stock manual */
type InventoryMovementType = "adjustment" | "purchase" | "sale" | "return" | "transfer_in" | "transfer_out" | "reservation" | "consumption" | "release" | "restock" | "correction";

export async function logStockMovement(data: {
  tenantId: string
  inventoryId: string
  type: InventoryMovementType
  quantity: string
  onHandBefore: string
  onHandAfter: string
  referenceType?: string
  referenceId?: string
  reason?: string
}) {
  await db.insert(inventoryMovements).values(data)
}

/** Helper: recalcular totalSales de un producto = suma de todos los branches */
async function updateProductCachedStock(tenantId: string, productId: string) {
  const rows = await db.select({ onHand: inventory.onHand })
    .from(inventory)
    .where(and(
      eq(inventory.tenantId, tenantId),
      eq(inventory.productId, productId),
    ))
  const totalStock = rows.reduce((sum, r) => sum + (Number(r.onHand) || 0), 0)
  await db.update(products).set({ totalSales: totalStock }).where(and(
    eq(products.tenantId, tenantId),
    eq(products.id, productId),
  ))
}
