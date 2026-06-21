import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../../db/client";
import { settings } from "../../db/schema";
import { tid } from "../../plugins/tenant";
import { SHIPPING_SETTINGS_KEY, readShippingConfig, quoteOptions } from "../../services/shipping.js";

/** Un método de envío dentro de una zona. */
const methodSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["flat", "free", "pickup", "weight"]),
  cost: z.number().int().nonnegative().default(0),
  /** Para 'free': subtotal mínimo para que sea gratis (0 = siempre). */
  freeFrom: z.number().int().nonnegative().default(0),
  /** Para 'weight': costo por kg. */
  perKg: z.number().int().nonnegative().default(0),
  active: z.boolean().default(true),
});

const zoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Ciudades/regiones que cubre la zona (match por nombre). */
  cities: z.array(z.string()).default([]),
  methods: z.array(methodSchema).default([]),
});

const configSchema = z.object({ zones: z.array(zoneSchema).default([]) });

export async function shippingRoutes(app: FastifyInstance) {
  app.get("/shipping/config", async (req) => readShippingConfig(tid(req)));

  app.put("/shipping/config", { schema: { body: configSchema } }, async (req, reply) => {
    await db
      .insert(settings)
      .values({ tenantId: tid(req), key: SHIPPING_SETTINGS_KEY, value: req.body })
      .onConflictDoUpdate({
        target: [settings.tenantId, settings.key],
        set: { value: req.body, updatedAt: new Date() },
      });
    return reply.send({ ok: true });
  });

  // Cotiza los métodos disponibles para una ciudad + subtotal (lo usa el checkout).
  app.get(
    "/shipping/quote",
    { schema: { querystring: z.object({ city: z.string().optional(), subtotal: z.coerce.number().default(0), weight: z.coerce.number().default(0) }) } },
    async (req) => {
      const { city, subtotal, weight } = req.query;
      const cfg = await readShippingConfig(tid(req));
      return quoteOptions(cfg, { city, subtotal, weight });
    },
  );
}
