import type { FastifyInstance, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { settings } from "../../db/schema";
import { tid } from "../../plugins/tenant";
import { MODULES } from "../system/registry.js";
import { isModuleEnabled, setModuleEnabled } from "../system/moduleState.js";

const STORE_KEY = (k: string) => `plugin_${k}`;

async function readVals(req: FastifyRequest, key: string): Promise<Record<string, unknown>> {
  const [row] = await db
    .select()
    .from(settings)
    .where(and(eq(settings.tenantId, tid(req)), eq(settings.key, STORE_KEY(key))))
    .limit(1);
  return (row?.value as Record<string, unknown>) ?? {};
}

export async function pluginRoutes(app: FastifyInstance) {
  app.get("/plugins/:key", { schema: { params: z.object({ key: z.string() }) } }, async (req, reply) => {
    const mod = MODULES.find((m) => m.key === req.params.key && m.kind === "plugin");
    if (!mod) return reply.notFound("Plugin no encontrado");
    const fields = mod.configSchema ?? [];
    const values = await readVals(req, mod.key);
    return reply.send({
      key: mod.key,
      name: mod.name,
      description: mod.description,
      features: mod.features ?? [],
      dependsOn: mod.dependsOn ?? [],
      fields,
      // Fuente ÚNICA de activación: modules_state (no values.enabled, ya deprecado).
      enabled: await isModuleEnabled(tid(req), mod.key),
      values,
    });
  });

  app.put(
    "/plugins/:key",
    { schema: { params: z.object({ key: z.string() }), body: z.object({ enabled: z.boolean().optional(), values: z.record(z.unknown()) }) } },
    async (req, reply) => {
      const mod = MODULES.find((m) => m.key === req.params.key && m.kind === "plugin");
      if (!mod) return reply.notFound("Plugin no encontrado");
      // Guarda SOLO la config (values) en plugin_<key>; la activación va a modules_state.
      await db
        .insert(settings)
        .values({ tenantId: tid(req), key: STORE_KEY(mod.key), value: req.body.values })
        .onConflictDoUpdate({
          target: [settings.tenantId, settings.key],
          set: { value: req.body.values, updatedAt: new Date() },
        });
      if (req.body.enabled !== undefined) {
        await setModuleEnabled(tid(req), mod.key, req.body.enabled);
      }
      return reply.send({ ok: true, key: mod.key });
    },
  );
}
