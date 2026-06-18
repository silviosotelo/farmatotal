import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { settings } from "../../db/schema";
import { MODULES } from "./registry.js";

const STATE_KEY = "modules_state";

async function readState(): Promise<Record<string, boolean>> {
  const [row] = await db.select().from(settings).where(eq(settings.key, STATE_KEY)).limit(1);
  return (row?.value as Record<string, boolean>) ?? {};
}

async function writeState(state: Record<string, boolean>) {
  await db
    .insert(settings)
    .values({ key: STATE_KEY, value: state })
    .onConflictDoUpdate({ target: settings.key, set: { value: state, updatedAt: new Date() } });
}

export async function moduleRoutes(app: FastifyInstance) {
  // Lista de módulos instalados + estado habilitado.
  app.get("/modules", async () => {
    const state = await readState();
    return {
      data: MODULES.map((m) => ({
        ...m,
        // Los nativos siempre activos; los plugins por defecto activos salvo que se apaguen.
        enabled: m.kind === "native" ? true : (state[m.key] ?? true),
      })),
      total: MODULES.length,
    };
  });

  // Habilitar / deshabilitar un módulo (los core no se pueden tocar).
  app.patch(
    "/modules/:key",
    { schema: { params: z.object({ key: z.string() }), body: z.object({ enabled: z.boolean() }) } },
    async (req, reply) => {
      const mod = MODULES.find((m) => m.key === req.params.key);
      if (!mod) return reply.notFound("Módulo no encontrado");
      if (mod.kind === "native") return reply.badRequest("Un módulo nativo no se puede deshabilitar");
      const state = await readState();
      state[mod.key] = req.body.enabled;
      await writeState(state);
      return reply.send({ key: mod.key, enabled: req.body.enabled });
    },
  );

  // Saber si un módulo está activo (lo usan otros endpoints como guard opcional).
  app.get("/modules/:key/status", { schema: { params: z.object({ key: z.string() }) } }, async (req) => {
    const mod = MODULES.find((m) => m.key === req.params.key);
    if (!mod) return { key: req.params.key, installed: false, enabled: false };
    const state = await readState();
    return { key: mod.key, installed: true, enabled: mod.kind === "native" ? true : (state[mod.key] ?? true) };
  });
}
