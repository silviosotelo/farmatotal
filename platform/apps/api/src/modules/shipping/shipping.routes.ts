import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { settings } from "../../db/schema";

const SETTINGS_KEY = "mod_shipping";

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
type ShippingConfig = z.infer<typeof configSchema>;

async function readConfig(): Promise<ShippingConfig> {
  const [row] = await db.select().from(settings).where(eq(settings.key, SETTINGS_KEY)).limit(1);
  return (row?.value as ShippingConfig) ?? { zones: [] };
}

export async function shippingRoutes(app: FastifyInstance) {
  app.get("/shipping/config", async () => readConfig());

  app.put("/shipping/config", { schema: { body: configSchema } }, async (req, reply) => {
    await db
      .insert(settings)
      .values({ key: SETTINGS_KEY, value: req.body })
      .onConflictDoUpdate({ target: settings.key, set: { value: req.body, updatedAt: new Date() } });
    return reply.send({ ok: true });
  });

  // Cotiza los métodos disponibles para una ciudad + subtotal (lo usa el checkout).
  app.get(
    "/shipping/quote",
    { schema: { querystring: z.object({ city: z.string().optional(), subtotal: z.coerce.number().default(0), weight: z.coerce.number().default(0) }) } },
    async (req) => {
      const { city, subtotal, weight } = req.query;
      const cfg = await readConfig();
      const cityLc = (city ?? "").trim().toLowerCase();
      // Zona que matchea la ciudad, o la primera como fallback.
      const zone =
        cfg.zones.find((z) => z.cities.some((c) => c.toLowerCase() === cityLc)) ?? cfg.zones[0];
      if (!zone) return { zone: null, options: [] };
      const options = zone.methods
        .filter((m) => m.active)
        .map((m) => {
          let cost = 0;
          if (m.type === "flat") cost = m.cost;
          else if (m.type === "free") cost = m.freeFrom > 0 && subtotal < m.freeFrom ? m.cost : 0;
          else if (m.type === "pickup") cost = 0;
          else if (m.type === "weight") cost = Math.round(m.perKg * weight);
          return { id: m.id, name: m.name, type: m.type, cost };
        });
      return { zone: { id: zone.id, name: zone.name }, options };
    },
  );
}
