import type { FastifyInstance, FastifyRequest } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { orders, payments, settings } from "../../db/schema";
import { tid } from "../../plugins/tenant";
import { env } from "../../env.js";
import {
  bancardJsUrl,
  isBancardEnabled,
  singleBuy,
  verifyConfirmationToken,
} from "../../services/bancard.js";

function genShopProcessId(): number {
  return Number(process.hrtime.bigint() % 1000000000n);
}

export async function paymentRoutes(app: FastifyInstance) {
  // Crea el pago Bancard vPOS para una orden → devuelve process_id para el iframe.
  app.post(
    "/payments/bancard/create",
    { schema: { body: z.object({ orderId: z.string().uuid() }) } },
    async (req, reply) => {
      if (!isBancardEnabled())
        return reply.serviceUnavailable("Bancard no configurado (claves vacías)");
      const [order] = await db
        .select()
        .from(orders)
        .where(and(eq(orders.tenantId, tid(req)), eq(orders.id, req.body.orderId)));
      if (!order) return reply.notFound("Orden no encontrada");

      const shopProcessId = genShopProcessId();
      await db.insert(payments).values({
        orderId: order.id,
        provider: "bancard",
        status: "pending",
        amount: order.total,
        providerRef: String(shopProcessId),
      });

      const base = env.PUBLIC_BASE_URL;
      const res = await singleBuy({
        shopProcessId,
        amount: order.total,
        description: `Orden ${order.number}`,
        returnUrl: `${base}/pago/retorno?order=${order.id}`,
        cancelUrl: `${base}/pago/retorno?order=${order.id}&cancel=1`,
      });
      const processId = (res as { process_id?: string }).process_id;
      if (!processId) return reply.badGateway("Bancard no devolvió process_id");
      return reply.send({ processId, jsUrl: bancardJsUrl(), shopProcessId });
    },
  );

  // Webhook server-to-server de confirmación de Bancard.
  app.post("/payments/bancard/confirm", async (req, reply) => {
    const op = (req.body as { operation?: Record<string, unknown> })?.operation;
    if (!op) return reply.badRequest("sin operation");
    const shopProcessId = Number(op.shop_process_id);
    const [pay] = await db
      .select()
      .from(payments)
      .where(eq(payments.providerRef, String(shopProcessId)))
      .orderBy(desc(payments.createdAt))
      .limit(1);
    if (!pay) return reply.notFound("pago no encontrado");

    const valid = verifyConfirmationToken({
      shopProcessId,
      amount: pay.amount,
      currency: String(op.currency ?? "PYG"),
      token: String(op.token ?? ""),
    });
    if (!valid) return reply.unauthorized("token inválido");

    const approved = op.response === "S" || op.response_code === "00";
    await db
      .update(payments)
      .set({
        status: approved ? "approved" : "rejected",
        rawPayload: JSON.stringify(req.body).slice(0, 4000),
        updatedAt: new Date(),
      })
      .where(eq(payments.id, pay.id));

    return reply.send({ status: "success" });
  });

  // Estado del pago de una orden.
  app.get(
    "/payments/bancard/status/:orderId",
    { schema: { params: z.object({ orderId: z.string().uuid() }) } },
    async (req) => {
      const [pay] = await db
        .select()
        .from(payments)
        .where(eq(payments.orderId, req.params.orderId))
        .orderBy(desc(payments.createdAt))
        .limit(1);
      return { status: pay?.status ?? "none", provider: pay?.provider ?? "bancard" };
    },
  );

  // ── Métodos de pago (config por provider, plugin-like) ──
  const PAYMENT_METHODS = [
    {
      key: "bancard",
      name: "Bancard (tarjeta)",
      description: "Pasarela vPOS de Bancard.",
      fields: [
        { key: "publicKey", label: "Public Key", type: "password" },
        { key: "privateKey", label: "Private Key", type: "password" },
        { key: "env", label: "Entorno", type: "select", options: [{ value: "staging", label: "Staging" }, { value: "production", label: "Producción" }] },
      ],
    },
    { key: "cash", name: "Efectivo (contra entrega)", description: "Pago en efectivo al recibir/retirar.", fields: [] },
    {
      key: "transfer",
      name: "Transferencia bancaria",
      description: "Transferencia con verificación manual.",
      fields: [{ key: "bankDetails", label: "Datos bancarios", type: "text" }],
    },
  ];

  type PayCfg = Record<string, unknown> & {
    __custom?: { key: string; name: string; description: string; instructions?: string }[];
  };
  const readPayCfg = async (req: FastifyRequest): Promise<PayCfg> => {
    const [row] = await db
      .select()
      .from(settings)
      .where(and(eq(settings.tenantId, tid(req)), eq(settings.key, "mod_payments")))
      .limit(1);
    return (row?.value as PayCfg) ?? {};
  };
  const writePayCfg = async (req: FastifyRequest, cfg: PayCfg) => {
    await db
      .insert(settings)
      .values({ tenantId: tid(req), key: "mod_payments", value: cfg })
      .onConflictDoUpdate({
        target: [settings.tenantId, settings.key],
        set: { value: cfg, updatedAt: new Date() },
      });
  };

  app.get("/payments/methods", async (req) => {
    const cfg = await readPayCfg(req);
    const fixed = PAYMENT_METHODS.map((m) => ({
      ...m,
      custom: false,
      enabled: (cfg[m.key] as { enabled?: boolean })?.enabled ?? m.key !== "bancard",
      values: (cfg[m.key] as Record<string, unknown>) ?? {},
    }));
    // Métodos custom (definidos por el usuario, como efectivo).
    const custom = (cfg.__custom ?? []).map((c) => ({
      key: c.key,
      name: c.name,
      description: c.description,
      fields: [{ key: "instructions", label: "Instrucciones para el cliente", type: "text" }],
      custom: true,
      enabled: (cfg[c.key] as { enabled?: boolean })?.enabled ?? true,
      values: (cfg[c.key] as Record<string, unknown>) ?? { instructions: c.instructions ?? "" },
    }));
    return { data: [...fixed, ...custom] };
  });

  app.put(
    "/payments/methods/:key",
    { schema: { params: z.object({ key: z.string() }), body: z.object({ enabled: z.boolean().optional(), values: z.record(z.unknown()) }) } },
    async (req, reply) => {
      const cfg = await readPayCfg(req);
      const isFixed = PAYMENT_METHODS.some((x) => x.key === req.params.key);
      const isCustom = (cfg.__custom ?? []).some((c) => c.key === req.params.key);
      if (!isFixed && !isCustom) return reply.notFound("Método no encontrado");
      cfg[req.params.key] = { enabled: req.body.enabled ?? false, ...req.body.values };
      await writePayCfg(req, cfg);
      return reply.send({ ok: true, key: req.params.key });
    },
  );

  // Crear un método de pago CUSTOM (estilo efectivo: nombre + instrucciones).
  app.post(
    "/payments/methods/custom",
    { schema: { body: z.object({ name: z.string().min(1).max(100), description: z.string().max(200).optional(), instructions: z.string().max(500).optional() }) } },
    async (req, reply) => {
      const cfg = await readPayCfg(req);
      const list = cfg.__custom ?? [];
      const base = req.body.name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "").slice(0, 30) || "metodo";
      let key = `custom_${base}`;
      let i = 1;
      while (list.some((c) => c.key === key) || PAYMENT_METHODS.some((m) => m.key === key)) key = `custom_${base}_${i++}`;
      list.push({ key, name: req.body.name, description: req.body.description ?? "", instructions: req.body.instructions ?? "" });
      cfg.__custom = list;
      cfg[key] = { enabled: true, instructions: req.body.instructions ?? "" };
      await writePayCfg(req, cfg);
      return reply.send({ ok: true, key });
    },
  );

  app.delete("/payments/methods/custom/:key", { schema: { params: z.object({ key: z.string() }) } }, async (req, reply) => {
    const cfg = await readPayCfg(req);
    const list = cfg.__custom ?? [];
    if (!list.some((c) => c.key === req.params.key)) return reply.notFound("Método custom no encontrado");
    cfg.__custom = list.filter((c) => c.key !== req.params.key);
    delete cfg[req.params.key];
    await writePayCfg(req, cfg);
    return reply.send({ ok: true });
  });

  // ── Transacciones (todas) ──
  app.get(
    "/payments/transactions",
    { schema: { querystring: z.object({ page: z.coerce.number().optional(), perPage: z.coerce.number().optional() }) } },
    async (req) => {
      const page = req.query.page ?? 1;
      const perPage = Math.min(100, req.query.perPage ?? 50);
      const rows = await db
        .select({
          id: payments.id,
          provider: payments.provider,
          status: payments.status,
          amount: payments.amount,
          providerRef: payments.providerRef,
          createdAt: payments.createdAt,
          orderNumber: orders.number,
          customerName: orders.customerName,
        })
        .from(payments)
        .leftJoin(orders, eq(orders.id, payments.orderId))
        .where(eq(orders.tenantId, tid(req)))
        .orderBy(desc(payments.createdAt))
        .limit(perPage)
        .offset((page - 1) * perPage);
      return { data: rows, page, perPage };
    },
  );
}
