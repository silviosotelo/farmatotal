import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { tenants } from "../../db/schema";
import { tid } from "../../plugins/tenant";

/**
 * Config del tenant actual (perfil de rubro / feature-flags). El store y el admin
 * leen `config` para activar/ocultar features (sucursales, stock, variantes,
 * unidades, tipos de producto, moneda). PATCH actualiza el tenant resuelto.
 */
export async function tenantRoutes(app: FastifyInstance) {
  app.get("/tenant", async (req) => {
    return { id: req.tenant.id, slug: req.tenant.slug, config: req.tenant.config ?? {} };
  });

  app.patch(
    "/tenant/config",
    { schema: { body: z.object({ config: z.record(z.string(), z.unknown()) }) } },
    async (req, reply) => {
      const [row] = await db
        .update(tenants)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .set({ config: (req.body as { config: Record<string, unknown> }).config as any })
        .where(eq(tenants.id, tid(req)))
        .returning();
      if (!row) return reply.notFound();
      return reply.send({ ok: true, config: row.config });
    },
  );
}
