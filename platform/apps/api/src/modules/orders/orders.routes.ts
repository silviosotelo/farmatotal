import type { FastifyInstance } from "fastify";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { branches, coupons, orderLines, orders, products } from "../../db/schema";
import { isErpPushEnabled, pushOrderToErp } from "../../services/erp.js";

const lineInput = z.object({
  productId: z.string().uuid().optional(),
  sku: z.string(),
  title: z.string(),
  unitPrice: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
});

const checkoutInput = z.object({
  customerName: z.string().min(1).max(200),
  customerEmail: z.string().email(),
  customerPhone: z.string().max(40).optional(),
  customerDoc: z.string().max(40).optional(),
  // Campos reales de checkout Farmatotal (ACF "Usuarios" / Checkout Field Editor)
  razonSocial: z.string().max(200).optional(),
  docType: z.enum(["CI", "RUC"]).optional(),
  docNumber: z.string().max(40).optional(),
  shippingMethod: z.enum(["pickup", "delivery"]),
  branchId: z.string().uuid().nullable().optional(),
  shippingAddress: z.record(z.unknown()).optional(),
  paymentMethod: z.enum(["online", "cash", "transfer"]),
  couponCode: z.string().max(60).optional(),
  lines: z.array(lineInput).min(1),
  notes: z.string().optional(),
});

const idParam = z.object({ id: z.string().uuid() });

function genNumber() {
  // FT-<timestamp36>-<rand> sin Date.now? usamos hrtime + random via crypto.
  const t = process.hrtime.bigint().toString(36).slice(-8).toUpperCase();
  return `FT-${t}`;
}

export async function orderRoutes(app: FastifyInstance) {
  // Checkout publico (el store lo llama)
  app.post("/orders/checkout", { schema: { body: checkoutInput } }, async (req, reply) => {
    const b = req.body;
    const subtotal = b.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

    let discount = 0;
    if (b.couponCode) {
      const [c] = await db.select().from(coupons).where(eq(coupons.code, b.couponCode)).limit(1);
      if (c && c.active && subtotal >= c.minSubtotal) {
        discount = c.type === "percent" ? Math.round((subtotal * c.value) / 100) : c.value;
        if (discount > subtotal) discount = subtotal;
        await db
          .update(coupons)
          .set({ usedCount: sql`${coupons.usedCount} + 1` })
          .where(eq(coupons.id, c.id));
      }
    }

    // Regla real Farmatotal: Delivery = Gs 12.000 fijo · Retiro en sucursal = gratis. Sin IVA.
    const shippingCost = b.shippingMethod === "delivery" ? 12000 : 0;
    const total = subtotal - discount + shippingCost;
    const number = genNumber();

    const [order] = await db
      .insert(orders)
      .values({
        number,
        customerName: b.razonSocial || b.customerName,
        customerEmail: b.customerEmail,
        customerPhone: b.customerPhone ?? null,
        customerDoc: b.docType && b.docNumber ? `${b.docType}:${b.docNumber}` : (b.customerDoc ?? null),
        shippingMethod: b.shippingMethod,
        branchId: b.branchId ?? null,
        shippingAddress: b.shippingAddress ?? null,
        paymentMethod: b.paymentMethod,
        status: "pending",
        subtotal,
        discount,
        shippingCost,
        total,
        couponCode: b.couponCode ?? null,
        notes: b.notes ?? null,
        events: [{ at: new Date().toISOString(), type: "created" }],
      })
      .returning();

    const insertedLines = await db
      .insert(orderLines)
      .values(
        b.lines.map((l) => ({
          orderId: order!.id,
          productId: l.productId ?? null,
          sku: l.sku,
          title: l.title,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
          lineTotal: l.unitPrice * l.quantity,
        })),
      )
      .returning();

    // Push al ERP (GATED). No bloquea ni rompe el checkout si falla.
    if (isErpPushEnabled()) {
      await safeErpPush(order!.id);
    }

    return reply.send({ id: order!.id, number, total, status: order!.status });
  });

  // Reintento manual del push al ERP (admin). 503 si está deshabilitado.
  app.post("/orders/:id/erp-push", { schema: { params: idParam } }, async (req, reply) => {
    if (!isErpPushEnabled())
      return reply.serviceUnavailable("ERP push deshabilitado (ERP_PUSH_ENABLED)");
    const result = await safeErpPush(req.params.id);
    if (!result) return reply.notFound();
    return reply.send(result);
  });

  /** Empuja la orden al ERP y registra el resultado en order.events. Nunca lanza. */
  async function safeErpPush(orderId: string) {
    const [o] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!o) return null;
    const lines = await db.select().from(orderLines).where(eq(orderLines.orderId, o.id));
    const branch = o.branchId
      ? (await db.select().from(branches).where(eq(branches.id, o.branchId)).limit(1))[0]
      : null;
    let event: { at: string; type: string; note?: string };
    try {
      const res = await pushOrderToErp(o, lines, branch ?? null);
      event = {
        at: new Date().toISOString(),
        type: res.ok ? "erp:sent" : "erp:error",
        note: `HTTP ${res.status}: ${res.body.slice(0, 200)}`,
      };
    } catch (e) {
      event = { at: new Date().toISOString(), type: "erp:error", note: String(e).slice(0, 200) };
    }
    await db
      .update(orders)
      .set({ events: [...(o.events ?? []), event], updatedAt: new Date() })
      .where(eq(orders.id, o.id));
    return { ok: event.type === "erp:sent", event };
  }

  // Admin: listado
  app.get("/orders", async (req) => {
    const q = req.query as { page?: string; perPage?: string };
    const page = Math.max(1, Number(q.page) || 1);
    const perPage = Math.min(100, Number(q.perPage) || 20);
    const [{ count } = { count: 0 }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders);
    const rows = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(perPage)
      .offset((page - 1) * perPage);
    return { data: rows, page, perPage, total: count, totalPages: Math.ceil(count / perPage) };
  });

  app.get("/orders/:id", { schema: { params: idParam } }, async (req, reply) => {
    const [o] = await db.select().from(orders).where(eq(orders.id, req.params.id)).limit(1);
    if (!o) return reply.notFound();
    const lines = await db.select().from(orderLines).where(eq(orderLines.orderId, o.id));
    return reply.send({ ...o, lines });
  });

  const statusInput = z.object({
    status: z.enum([
      "pending",
      "paid",
      "processing",
      "fulfilled",
      "delivered",
      "cancelled",
      "refunded",
    ]),
    note: z.string().optional(),
  });

  app.patch(
    "/orders/:id/status",
    { schema: { params: idParam, body: statusInput } },
    async (req, reply) => {
      const [o] = await db.select().from(orders).where(eq(orders.id, req.params.id)).limit(1);
      if (!o) return reply.notFound();
      const events = [
        ...(o.events ?? []),
        { at: new Date().toISOString(), type: `status:${req.body.status}`, note: req.body.note },
      ];
      const [row] = await db
        .update(orders)
        .set({ status: req.body.status, events, updatedAt: new Date() })
        .where(eq(orders.id, o.id))
        .returning();
      return reply.send(row);
    },
  );

  // Reembolso (total o parcial). Total → estado refunded; parcial → registra el
  // evento sin cambiar el estado. Queda asentado en order.events con monto y motivo.
  const refundInput = z.object({
    amount: z.number().int().nonnegative().optional(),
    reason: z.string().max(300).optional(),
  });
  app.post(
    "/orders/:id/refund",
    { schema: { params: idParam, body: refundInput } },
    async (req, reply) => {
      const [o] = await db.select().from(orders).where(eq(orders.id, req.params.id)).limit(1);
      if (!o) return reply.notFound();
      const amount = req.body.amount && req.body.amount > 0 ? req.body.amount : o.total;
      const isFull = amount >= o.total;
      const note = `Reembolso ${isFull ? "total" : "parcial"}${req.body.reason ? ` — ${req.body.reason}` : ""}`;
      const events = [
        ...(o.events ?? []),
        { at: new Date().toISOString(), type: "refund", note, amount },
      ];
      const [row] = await db
        .update(orders)
        .set({ status: isFull ? "refunded" : o.status, events, updatedAt: new Date() })
        .where(eq(orders.id, o.id))
        .returning();
      return reply.send(row);
    },
  );
}
