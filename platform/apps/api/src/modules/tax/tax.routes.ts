import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../../db/client";
import { options } from "../../db/schema";
import { tid } from "../../plugins/tenant";
import { TAX_SETTINGS_KEY, readTaxConfig, resolveRate, taxPortion } from "../../services/tax.js";

/** Una tasa de impuesto (ej. IVA 10%, IVA 5%, Exento). */
const rateSchema = z.object({
  id: z.string(),
  name: z.string(),
  percent: z.number().nonnegative(),
  isDefault: z.boolean().default(false),
});

const configSchema = z.object({
  /** Si los precios cargados ya incluyen el impuesto (modelo Paraguay: IVA incluido). */
  pricesIncludeTax: z.boolean().default(true),
  rates: z.array(rateSchema).default([]),
});

export async function taxRoutes(app: FastifyInstance) {
  app.get("/tax/config", async (req) => readTaxConfig(tid(req)));

  app.put("/tax/config", { schema: { body: configSchema } }, async (req, reply) => {
    await db
      .insert(options)
      .values({ tenantId: tid(req), name: TAX_SETTINGS_KEY, value: req.body })
      .onConflictDoUpdate({
        target: [options.tenantId, options.name],
        set: { value: req.body, updatedAt: new Date() },
      });
    return reply.send({ ok: true });
  });

  // Desglose de impuesto para un monto (lo usa el detalle de pedido / checkout).
  app.get(
    "/tax/breakdown",
    {
      schema: {
        querystring: z.object({
          amount: z.coerce.number().default(0),
          rateId: z.string().optional(),
        }),
      },
    },
    async (req) => {
      const { amount, rateId } = req.query as { amount: number; rateId?: string };
      const cfg = await readTaxConfig(tid(req));
      const rate = resolveRate(cfg, rateId);
      const tax = taxPortion(amount, rate.percent, cfg.pricesIncludeTax);
      const net = cfg.pricesIncludeTax ? amount - tax : amount;
      const gross = cfg.pricesIncludeTax ? amount : amount + tax;
      return {
        rate: { name: rate.name, percent: rate.percent },
        pricesIncludeTax: cfg.pricesIncludeTax,
        net,
        tax,
        gross,
      };
    },
  );
}
