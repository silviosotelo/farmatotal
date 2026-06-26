import type { FastifyInstance, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { settings, tenants } from "../../db/schema";
import { tid } from "../../plugins/tenant";
import { MODULES } from "../system/registry.js";
import { isModuleEnabled, setModuleEnabled } from "../system/moduleState.js";

const STORE_KEY = (k: string) => `plugin_${k}`;

/** Campos sensibles que NUNCA se exponen al frontend */
const SENSITIVE_FIELDS = new Set(["privateKey", "secretKey", "accessToken", "password", "token", "secret"]);

/** Filtra valores sensibles antes de enviar al frontend */
function sanitizeValues(values: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (SENSITIVE_FIELDS.has(k)) {
      safe[k] = typeof v === "string" && v.length > 0 ? "••••••••" : "";
    } else {
      safe[k] = v;
    }
  }
  return safe;
}

async function syncTenantFlags(tenantId: string, pluginKey: string, enabled: boolean) {
  const mod = MODULES.find((m) => m.key === pluginKey);
  const flags = mod?.controlsFlags;
  if (!flags || flags.length === 0) return;
  const [row] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  const cfg = { ...((row?.config as Record<string, unknown>) ?? {}) };
  for (const flag of flags) {
    cfg[flag] = enabled;
  }
  await db.update(tenants).set({ config: cfg }).where(eq(tenants.id, tenantId));
}

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
    const rawValues = await readVals(req, mod.key);
    const values = sanitizeValues(rawValues);
    return reply.send({
      key: mod.key,
      name: mod.name,
      description: mod.description,
      features: mod.features ?? [],
      dependsOn: mod.dependsOn ?? [],
      fields,
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
      await db
        .insert(settings)
        .values({ tenantId: tid(req), key: STORE_KEY(mod.key), value: req.body.values })
        .onConflictDoUpdate({
          target: [settings.tenantId, settings.key],
          set: { value: req.body.values, updatedAt: new Date() },
        });
      if (req.body.enabled !== undefined) {
        await setModuleEnabled(tid(req), mod.key, req.body.enabled);
        await syncTenantFlags(tid(req), mod.key, req.body.enabled);
      }
      return reply.send({ ok: true, key: mod.key });
    },
  );
}
