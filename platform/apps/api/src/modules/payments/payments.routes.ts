import type { FastifyInstance, FastifyRequest } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { orders, payments, settings } from "../../db/schema";
import { tid } from "../../plugins/tenant";
import { env } from "../../env.js";
import { doAction } from "../system/hooks.js";
import {
  bancardJsUrl,
  getConfirmation,
  isBancardEnabled,
  singleBuy,
  verifyConfirmationToken,
} from "../../services/bancard.js";

function genShopProcessId(): number {
  return Number(process.hrtime.bigint() % 1000000000n) * 1000 + Math.floor(Math.random() * 1000);
}

type PaymentRow = typeof payments.$inferSelect;

/**
 * Aplica el veredicto de Bancard de forma idempotente: marca el pago y, si fue
 * aprobado y la orden seguía pendiente, la pasa a "paid" con un evento de auditoría.
 */
async function applyVerdict(pay: PaymentRow, approved: boolean, rawPayload?: string) {
  const newStatus = approved ? "approved" : "rejected";
  if (pay.status !== newStatus) {
    await db
      .update(payments)
      .set({ status: newStatus, ...(rawPayload ? { rawPayload: rawPayload.slice(0, 4000) } : {}), updatedAt: new Date() })
      .where(eq(payments.id, pay.id));
  }
  if (approved) {
    const [ord] = await db.select().from(orders).where(eq(orders.id, pay.orderId)).limit(1);
    if (ord && ord.status === "pending") {
      const events = [
        ...(ord.events ?? []),
        { at: new Date().toISOString(), type: "payment_approved", note: `Bancard ref ${pay.providerRef}`, by: "bancard" },
      ];
      await db.update(orders).set({ status: "paid", events, updatedAt: new Date() }).where(eq(orders.id, ord.id));
      // Hook de ciclo de vida: módulos activos reaccionan (multi_inventory descuenta
      // stock, marketing/mailer notifican, etc.). Gating por tenant vía hooks.
      await doAction("order.paid", { tenantId: ord.tenantId, orderId: ord.id });
    }
  }
}

export async function paymentRoutes(app: FastifyInstance) {
  // Crea el pago Bancard vPOS para una orden → devuelve process_id para el iframe.
  app.post(
    "/payments/bancard/create",
    { schema: { body: z.object({ orderId: z.string().uuid() }) } },
    async (req, reply) => {
      if (!await isBancardEnabled(tid(req)))
        return reply.serviceUnavailable("Bancard no configurado (claves vacías)");

      // Leer URLs del plugin config
      const { getConfig } = await import("../../services/bancard.js")
      const pluginCfg = await getConfig(tid(req))
      const storeUrl = pluginCfg.storeUrl || env.PUBLIC_BASE_URL
      const publicApiUrl = pluginCfg.publicApiUrl || env.PUBLIC_API_URL

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

      const res = await singleBuy(tid(req), {
        shopProcessId,
        amount: order.total,
        description: `Orden ${order.number}`,
        returnUrl: `${storeUrl}/pago/retorno?order=${order.id}`,
        cancelUrl: `${storeUrl}/pago/retorno?order=${order.id}&cancel=1`,
      });
      const processId = (res as { process_id?: string }).process_id;
      if (!processId) return reply.badGateway("Bancard no devolvió process_id");
      return reply.send({
        processId,
        jsUrl: await bancardJsUrl(tid(req)),
        shopProcessId,
        webhookUrl: `${publicApiUrl}/payments/bancard/confirm`,
      });
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

    const valid = await verifyConfirmationToken(tid(req), {
      shopProcessId,
      amount: pay.amount,
      currency: String(op.currency ?? "PYG"),
      token: String(op.token ?? ""),
    });
    if (!valid) return reply.unauthorized("token inválido");

    const approved = op.response === "S" || op.response_code === "00";
    await applyVerdict(pay, approved, JSON.stringify(req.body));

    return reply.send({ status: "success" });
  });

  // Estado del pago de una orden. Si sigue pendiente, consulta activamente a
  // Bancard (get_single_buy_confirmation) para no depender solo del webhook.
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
      if (!pay) return { status: "none", provider: "bancard" };

      if (pay.status === "pending" && pay.provider === "bancard" && await isBancardEnabled(tid(req)) && pay.providerRef) {
        try {
          const conf = await getConfirmation(tid(req), Number(pay.providerRef));
          if (conf.settled) {
            await applyVerdict(pay, conf.approved, JSON.stringify(conf.raw));
            return { status: conf.approved ? "approved" : "rejected", provider: "bancard" };
          }
        } catch {
          /* la consulta puede fallar mientras el usuario aún no terminó: se mantiene pending */
        }
      }
      return { status: pay.status, provider: pay.provider };
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

  // ─── Bancard: Catastro de tarjeta (cards/new) ───
  app.post("/payments/bancard/cards/new", async (req, reply) => {
    const { cardsNew } = await import("../../services/bancard.js")
    const { cardId, userId, userCellPhone, userMail, returnUrl } = req.body as {
      cardId: number; userId: number; userCellPhone: string; userMail: string; returnUrl: string
    }
    const result = await cardsNew(tid(req), { cardId, userId, userCellPhone, userMail, returnUrl })
    return reply.send(result)
  })

  // ─── Bancard: Listar tarjetas catastradas (users_cards) ───
  app.post("/payments/bancard/users-cards", async (req, reply) => {
    const { usersCards } = await import("../../services/bancard.js")
    const { userId } = req.body as { userId: number }
    const result = await usersCards(tid(req), userId)
    return reply.send(result)
  })

  // ─── Bancard: Eliminar tarjeta catastrada ───
  app.post("/payments/bancard/delete-card", async (req, reply) => {
    const { deleteCard } = await import("../../services/bancard.js")
    const { userId, cardToken } = req.body as { userId: number; cardToken: string }
    const result = await deleteCard(tid(req), userId, cardToken)
    return reply.send(result)
  })

  // ─── Bancard: Pago con token (charge) ───
  app.post("/payments/bancard/charge", async (req, reply) => {
    const { charge } = await import("../../services/bancard.js")
    const { shopProcessId, amount, currency, aliasToken, description, returnUrl, cancelUrl, additionalData, billing } = req.body as {
      shopProcessId: number; amount: number; currency?: string; aliasToken: string
      description?: string; returnUrl: string; cancelUrl?: string; additionalData?: string; billing?: Record<string, unknown>
    }
    const result = await charge(tid(req), { shopProcessId, amount, currency, aliasToken, description, returnUrl, cancelUrl, additionalData, billing })
    return reply.send(result)
  })

  // ─── Bancard: Reversa (rollback) ───
  app.post("/payments/bancard/rollback", async (req, reply) => {
    const { rollback } = await import("../../services/bancard.js")
    const { shopProcessId } = req.body as { shopProcessId: number }
    const result = await rollback(tid(req), shopProcessId)
    return reply.send(result)
  })
}
