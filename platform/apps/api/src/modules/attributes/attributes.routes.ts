import type { FastifyInstance, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { settings } from "../../db/schema";
import { tid } from "../../plugins/tenant";

const SETTINGS_KEY = "mod_attributes";

/** Un atributo global reutilizable (ej. Color → Rojo/Azul; Talle → S/M/L). */
const attributeSchema = z.object({
  id: z.string(),
  name: z.string(),
  values: z.array(z.string()).default([]),
});

const configSchema = z.object({ attributes: z.array(attributeSchema).default([]) });
type AttributesConfig = z.infer<typeof configSchema>;

async function readConfig(req: FastifyRequest): Promise<AttributesConfig> {
  const [row] = await db
    .select()
    .from(settings)
    .where(and(eq(settings.tenantId, tid(req)), eq(settings.key, SETTINGS_KEY)))
    .limit(1);
  return (row?.value as AttributesConfig) ?? { attributes: [] };
}

export async function attributesRoutes(app: FastifyInstance) {
  app.get("/attributes", async (req) => readConfig(req));

  app.put("/attributes", { schema: { body: configSchema } }, async (req, reply) => {
    await db
      .insert(settings)
      .values({ tenantId: tid(req), key: SETTINGS_KEY, value: req.body })
      .onConflictDoUpdate({
        target: [settings.tenantId, settings.key],
        set: { value: req.body, updatedAt: new Date() },
      });
    return reply.send({ ok: true });
  });
}
