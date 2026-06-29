import type { FastifyInstance, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { options } from "../../db/schema";
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
    .from(options)
    .where(and(eq(options.tenantId, tid(req)), eq(options.name, SETTINGS_KEY)))
    .limit(1);
  return (row?.value as AttributesConfig) ?? { attributes: [] };
}

export async function attributesRoutes(app: FastifyInstance) {
  app.get("/attributes", async (req) => readConfig(req));

  app.put("/attributes", { schema: { body: configSchema } }, async (req, reply) => {
    await db
      .insert(options)
      .values({ tenantId: tid(req), name: SETTINGS_KEY, value: req.body })
      .onConflictDoUpdate({
        target: [options.tenantId, options.name],
        set: { value: req.body, updatedAt: new Date() },
      });
    return reply.send({ ok: true });
  });
}
