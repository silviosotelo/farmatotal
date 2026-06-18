import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { settings } from "../../db/schema";

const SETTINGS_KEY = "mod_tax";

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
type TaxConfig = z.infer<typeof configSchema>;

/** Defaults Paraguay: IVA 10% (general), 5% (reducido), Exento. Precios IVA incluido. */
const DEFAULTS: TaxConfig = {
  pricesIncludeTax: true,
  rates: [
    { id: "iva10", name: "IVA 10%", percent: 10, isDefault: true },
    { id: "iva5", name: "IVA 5%", percent: 5, isDefault: false },
    { id: "exento", name: "Exento", percent: 0, isDefault: false },
  ],
};

async function readConfig(): Promise<TaxConfig> {
  const [row] = await db.select().from(settings).where(eq(settings.key, SETTINGS_KEY)).limit(1);
  return (row?.value as TaxConfig) ?? DEFAULTS;
}

/** Porción de impuesto de un monto, según si el precio lo incluye o no. */
function taxPortion(amount: number, percent: number, included: boolean): number {
  if (percent <= 0) return 0;
  const r = percent / 100;
  return included ? Math.round(amount - amount / (1 + r)) : Math.round(amount * r);
}

export async function taxRoutes(app: FastifyInstance) {
  app.get("/tax/config", async () => readConfig());

  app.put("/tax/config", { schema: { body: configSchema } }, async (req, reply) => {
    await db
      .insert(settings)
      .values({ key: SETTINGS_KEY, value: req.body })
      .onConflictDoUpdate({ target: settings.key, set: { value: req.body, updatedAt: new Date() } });
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
      const cfg = await readConfig();
      const rate =
        cfg.rates.find((r) => r.id === rateId) ??
        cfg.rates.find((r) => r.isDefault) ??
        cfg.rates[0] ??
        DEFAULTS.rates[0];
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
