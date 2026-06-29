import type { FastifyInstance, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { options, tenants } from "../../db/schema";
import { tid } from "../../plugins/tenant";
import { MODULES } from "./registry.js";

const STATE_KEY = "modules_state";

async function syncTenantFlags(tenantId: string, moduleKey: string, enabled: boolean) {
  const mod = MODULES.find((m) => m.key === moduleKey);
  const flags = mod?.controlsFlags;
  if (!flags || flags.length === 0) return;
  const [row] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  const cfg = { ...((row?.config as Record<string, unknown>) ?? {}) };
  for (const flag of flags) {
    cfg[flag] = enabled;
  }
  await db.update(tenants).set({ config: cfg }).where(eq(tenants.id, tenantId));
}

async function readState(req: FastifyRequest): Promise<Record<string, boolean>> {
  const [row] = await db
    .select()
    .from(options)
    .where(and(eq(options.tenantId, tid(req)), eq(options.name, STATE_KEY)))
    .limit(1);
  return (row?.value as Record<string, boolean>) ?? {};
}

async function writeState(req: FastifyRequest, state: Record<string, boolean>) {
  await db
    .insert(options)
    .values({ tenantId: tid(req), name: STATE_KEY, value: state })
    .onConflictDoUpdate({
      target: [options.tenantId, options.name],
      set: { value: state, updatedAt: new Date() },
    });
}

export async function moduleRoutes(app: FastifyInstance) {
  app.get("/modules", async (req) => {
    const state = await readState(req);
    return {
      data: MODULES.map((m) => ({
        ...m,
        enabled: m.kind === "native" ? true : (state[m.key] ?? true),
      })),
      total: MODULES.length,
    };
  });

  app.patch(
    "/modules/:key",
    { schema: { params: z.object({ key: z.string() }), body: z.object({ enabled: z.boolean() }) } },
    async (req, reply) => {
      const mod = MODULES.find((m) => m.key === req.params.key);
      if (!mod) return reply.notFound("Módulo no encontrado");
      if (mod.kind === "native") return reply.badRequest("Un módulo nativo no se puede deshabilitar");
      const state = await readState(req);
      state[mod.key] = req.body.enabled;
      await writeState(req, state);
      await syncTenantFlags(tid(req), mod.key, req.body.enabled);
      return reply.send({ key: mod.key, enabled: req.body.enabled });
    },
  );

  app.get("/modules/:key/status", { schema: { params: z.object({ key: z.string() }) } }, async (req) => {
    const mod = MODULES.find((m) => m.key === req.params.key);
    if (!mod) return { key: req.params.key, installed: false, enabled: false };
    const state = await readState(req);
    return { key: mod.key, installed: true, enabled: mod.kind === "native" ? true : (state[mod.key] ?? true) };
  });
}
