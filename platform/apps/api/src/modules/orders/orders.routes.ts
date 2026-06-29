import type { FastifyInstance } from "fastify";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { branches, coupons, orderItems, orders, products } from "../../db/schema";
import { isErpPushEnabled, pushOrderToErp } from "../../services/erp.js";
import { tid } from "../../plugins/tenant";
import { readTaxConfig, resolveRate, taxPortion } from "../../services/tax.js";
import { readShippingConfig, resolveShippingCost } from "../../services/shipping.js";
import { doAction } from "../system/hooks.js";

const lineInput = z.object({
  productId: z.string().uuid().optional(),
  sku: z.string(),
  title: z.string(),
  unitPrice: z.number().int().nonnegative(),
  // Cantidad: permite decimales (multi-rubro: 1.5 kg, 0.25 m). El step real lo
  // define el producto; acá solo validamos > 0.
  quantity: z.number().positive(),
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
  /** Id del método de envío elegido (de /shipping/quote). El server re-resuelve
   * el costo desde la config; si no viene, usa el primer método no-pickup de la zona. */
  shippingMethodId: z.string().optional(),
  branchId: z.string().uuid().nullable().optional(),
  shippingAddress: z.record(z.string(), z.unknown()).optional(),
  /** Id de la tasa de impuesto a aplicar (default: la marcada como default). */
  taxRateId: z.string().optional(),
  paymentMethod: z.enum(["online", "cash", "transfer"]),
  couponCode: z.string().max(60).optional(),
  lines: z.array(lineInput).min(1),
  notes: z.string().optional(),
});

const idParam = z.object({ id: z.string().uuid() });

function genNumber(prefix: string) {
  // <PREFIX>-<timestamp36> sin Date.now (usamos hrtime). Prefijo white-label
  // configurable por tenant (config.orderPrefix), default genérico "ORD".
  const t = process.hrtime.bigint().toString(36).slice(-8).toUpperCase();
  const p = (prefix || "ORD").replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase() || "ORD";
  return `${p}-${t}`;
}

export async function orderRoutes(app: FastifyInstance) {
  // Checkout publico (el store lo llama)
  app.post("/orders/checkout", { schema: { body: checkoutInput } }, async (req, reply) => {
    const b = req.body as z.infer<typeof checkoutInput>;
    // Cantidad decimal: el total de cada línea se redondea a Gs entero y el
    // subtotal es la SUMA de las líneas (así la orden cuadra fila por fila).
    const lineTotals = b.lines.map((l) => Math.round(l.unitPrice * l.quantity));
    const subtotal = lineTotals.reduce((s, t) => s + t, 0);

    let discount = 0;
    if (b.couponCode) {
      const [c] = await db
        .select()
        .from(coupons)
        .where(and(eq(coupons.tenantId, tid(req)), eq(coupons.code, b.couponCode)))
        .limit(1);
      if (c && c.active && subtotal >= c.minSubtotal) {
        discount = c.type === "percent" ? Math.round((subtotal * c.value) / 100) : c.value;
        if (discount > subtotal) discount = subtotal;
        await db
          .update(coupons)
          .set({ usedCount: sql`${coupons.usedCount} + 1` })
          .where(eq(coupons.id, c.id));
      }
    }

    // Envío: server-authoritative desde la config per-tenant (mod_shipping). Retiro
    // en sucursal = gratis; delivery = costo del método elegido en la zona de la ciudad.
    const city = (b.shippingAddress?.city as string | undefined) ?? undefined;
    let shippingCost = 0;
    let shippingMethodName: string | null = null;
    if (b.shippingMethod === "delivery") {
      const scfg = await readShippingConfig(tid(req));
      const r = resolveShippingCost(scfg, { methodId: b.shippingMethodId, city, subtotal, weight: 0 });
      shippingCost = r.cost;
      shippingMethodName = r.methodName;
    }

    // Impuesto: config per-tenant (mod_tax). Base = subtotal - descuento (envío no
    // gravado). Si los precios INCLUYEN impuesto, taxTotal es informativo (ya está en
    // el total); si NO, se suma al total.
    const tcfg = await readTaxConfig(tid(req));
    const rate = resolveRate(tcfg, b.taxRateId);
    const taxBase = subtotal - discount;
    const taxTotal = taxPortion(taxBase, rate.percent, tcfg.pricesIncludeTax);
    const total = tcfg.pricesIncludeTax
      ? subtotal - discount + shippingCost
      : subtotal - discount + shippingCost + taxTotal;
    const number = genNumber((req.tenant.config?.orderPrefix as string | undefined) ?? "ORD");

    const [order] = await db
      .insert(orders)
      .values({
        orderNumber: number,
        tenantId: tid(req),
        currency: (req.tenant.config?.currency as string | undefined) ?? "PYG",
        customerId: null,
        guestEmail: b.customerEmail,
        paymentMethod: b.paymentMethod,
        branchId: b.branchId ?? null,
        status: "pending",
        subtotal: String(subtotal),
        discountTotal: String(discount),
        shippingTotal: String(shippingCost),
        taxTotal: String(taxTotal),
        total: String(total),
        customerNote: b.notes ?? null,
      })
      .returning();

    const insertedLines = await db
      .insert(orderItems)
      .values(
        b.lines.map((l, i) => ({
          orderId: order!.id,
          tenantId: tid(req),
          itemType: "line_item" as const,
          productId: l.productId ?? null,
          sku: l.sku,
          name: l.title,
          quantity: Math.round(l.quantity),
          subtotal: String(lineTotals[i]!),
          subtotalTax: "0",
          total: String(lineTotals[i]!),
          totalTax: "0",
        })),
      )
      .returning();

    // Hook de ciclo de vida: los módulos activos se enganchan acá (multi_inventory
    // descuenta stock; erp_sync empuja el pedido al ERP; mailer/whatsapp notifican).
    // El push al ERP ya NO es una llamada hardcodeada: lo maneja el módulo erp_sync.
    await doAction("order.created", { tenantId: tid(req), orderId: order!.id, paymentMethod: b.paymentMethod });

    return reply.send({ id: order!.id, number, total, status: order!.status });
  });

  // Reintento manual del push al ERP (admin). 503 si está deshabilitado.
  app.post("/orders/:id/erp-push", { schema: { params: idParam } }, async (req, reply) => {
    if (!isErpPushEnabled())
      return reply.serviceUnavailable("ERP push deshabilitado (ERP_PUSH_ENABLED)");
    const result = await safeErpPush((req.params as { id: string }).id);
    if (!result) return reply.notFound();
    return reply.send(result);
  });

  /** Empuja la orden al ERP y registra el resultado en order.events. Nunca lanza. */
  async function safeErpPush(orderId: string) {
    const [o] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!o) return null;
    const lines = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id));
    const branch = o.branchId
      ? (await db.select().from(branches).where(eq(branches.id, o.branchId)).limit(1))[0]
      : null;
    try {
      const res = await pushOrderToErp(o as any, lines as any, branch ?? null);
      return { ok: res.ok, status: res.status };
    } catch (e) {
      return { ok: false, error: String(e).slice(0, 200) };
    }
  }

  // Admin: listado
  app.get("/orders", async (req) => {
    const q = req.query as { page?: string; perPage?: string };
    const page = Math.max(1, Number(q.page) || 1);
    const perPage = Math.min(100, Number(q.perPage) || 20);
    const [{ count } = { count: 0 }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(eq(orders.tenantId, tid(req)));
    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.tenantId, tid(req)))
      .orderBy(desc(orders.createdAt))
      .limit(perPage)
      .offset((page - 1) * perPage);
    return { data: rows, page, perPage, total: count, totalPages: Math.ceil(count / perPage) };
  });

  // Rastreo público de pedido por número (GET abierto).
  app.get(
    "/orders/by-number/:number",
    { schema: { params: z.object({ number: z.string() }) } },
    async (req, reply) => {
      const [o] = await db
        .select()
        .from(orders)
        .where(and(eq(orders.tenantId, tid(req)), eq(orders.orderNumber, (req.params as { number: string }).number)))
        .limit(1);
      if (!o) return reply.notFound();
      const lines = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id));
      return reply.send({ ...o, lines });
    },
  );

  app.get("/orders/:id", { schema: { params: idParam } }, async (req, reply) => {
    const [o] = await db.select().from(orders).where(eq(orders.id, (req.params as { id: string }).id)).limit(1);
    if (!o) return reply.notFound();
    const lines = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id));
    return reply.send({ ...o, lines });
  });

  const statusInput = z.object({
    status: z.enum([
      "pending",
      "confirmed",
      "processing",
      "completed",
      "cancelled",
      "closed",
    ]),
    note: z.string().optional(),
  });

  app.patch(
    "/orders/:id/status",
    { schema: { params: idParam, body: statusInput } },
    async (req, reply) => {
      const params = req.params as { id: string };
      const body = req.body as z.infer<typeof statusInput>;
      const [o] = await db
        .select()
        .from(orders)
        .where(and(eq(orders.tenantId, tid(req)), eq(orders.id, params.id)))
        .limit(1);
      if (!o) return reply.notFound();
      const [row] = await db
        .update(orders)
        .set({ status: body.status, updatedAt: new Date() })
        .where(eq(orders.id, o.id))
        .returning();

      // Fire stock restore hooks on cancellation or refund
      if (body.status === "cancelled") {
        await doAction("order.cancelled", { tenantId: tid(req), orderId: o.id });
      } else if (body.status === "closed") {
        await doAction("order.refunded", { tenantId: tid(req), orderId: o.id });
      }

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
      const params = req.params as { id: string };
      const body = req.body as z.infer<typeof refundInput>;
      const [o] = await db
        .select()
        .from(orders)
        .where(and(eq(orders.tenantId, tid(req)), eq(orders.id, params.id)))
        .limit(1);
      if (!o) return reply.notFound();
      const amount = body.amount && body.amount > 0 ? body.amount : Number(o.total);
      const isFull = amount >= Number(o.total);
      const note = `Reembolso ${isFull ? "total" : "parcial"}${body.reason ? ` — ${body.reason}` : ""}`;
      const [row] = await db
        .update(orders)
        .set({ status: isFull ? "closed" : o.status, updatedAt: new Date() })
        .where(eq(orders.id, o.id))
        .returning();

      // Fire stock restore hook on full refund
      if (isFull) {
        await doAction("order.refunded", { tenantId: tid(req), orderId: o.id });
      }

      return reply.send(row);
    },
  );
}
