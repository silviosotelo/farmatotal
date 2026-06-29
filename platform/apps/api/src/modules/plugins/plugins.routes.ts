import type { FastifyInstance, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { options, tenants } from "../../db/schema";
import { tid } from "../../plugins/tenant";
import { MODULES } from "../system/registry.js";
import { isModuleEnabled, setModuleEnabled } from "../system/moduleState.js";

const STORE_KEY = (k: string) => `plugin_${k}`;

/** Filtra campos marcados como `sensitive` en el configSchema del registry */
function sanitizeValues(values: Record<string, unknown>, fields: Array<{ key: string; sensitive?: boolean }>): Record<string, unknown> {
  const sensitiveKeys = new Set(fields.filter((f) => f.sensitive).map((f) => f.key));
  if (sensitiveKeys.size === 0) return values;
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    safe[k] = sensitiveKeys.has(k) && typeof v === "string" && v.length > 0 ? "••••••••" : v;
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
    .from(options)
    .where(and(eq(options.tenantId, tid(req)), eq(options.name, STORE_KEY(key))))
    .limit(1);
  return (row?.value as Record<string, unknown>) ?? {};
}

export async function pluginRoutes(app: FastifyInstance) {
  app.get("/plugins/:key", { schema: { params: z.object({ key: z.string() }) } }, async (req, reply) => {
    const mod = MODULES.find((m) => m.key === (req.params as { key: string }).key && m.kind === "plugin");
    if (!mod) return reply.notFound("Plugin no encontrado");
    const fields = mod.configSchema ?? [];
    const rawValues = await readVals(req, mod.key);
    const values = sanitizeValues(rawValues, fields);

    // Compute derived fields (webhook URL for payment gateways)
    if (mod.key === "gw_bancard" && rawValues.publicApiUrl) {
      values._webhookUrl = `${rawValues.publicApiUrl}/payments/bancard/confirm`;
    }

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
    { schema: { params: z.object({ key: z.string() }), body: z.object({ enabled: z.boolean().optional(), values: z.record(z.string(), z.unknown()) }) } },
    async (req, reply) => {
      const mod = MODULES.find((m) => m.key === (req.params as { key: string }).key && m.kind === "plugin");
      if (!mod) return reply.notFound("Plugin no encontrado");
      const body = req.body as { enabled?: boolean; values?: Record<string, unknown> };
      await db
        .insert(options)
        .values({ tenantId: tid(req), name: STORE_KEY(mod.key), value: body.values })
        .onConflictDoUpdate({
          target: [options.tenantId, options.name],
          set: { value: body.values, updatedAt: new Date() },
        });
      if (body.enabled !== undefined) {
        await setModuleEnabled(tid(req), mod.key, body.enabled);
        await syncTenantFlags(tid(req), mod.key, body.enabled);
      }
      return reply.send({ ok: true, key: mod.key });
    },
  );
}
