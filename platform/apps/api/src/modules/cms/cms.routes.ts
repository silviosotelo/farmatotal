import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { BLOCK_TYPES, blockDefaults } from "@platform/shared-types";
import { db } from "../../db/client";
import { pages, settings } from "../../db/schema";
import { tid } from "../../plugins/tenant";

const pageInput = z.object({
  slug: z.string().min(1).max(250),
  title: z.string().min(1).max(300),
  // blocks = array de bloques ChaiBuilder. JSONB acepta cualquier estructura.
  blocks: z.unknown().optional(),
  seo: z.object({ title: z.string().optional(), description: z.string().optional() }).optional(),
  published: z.boolean().optional(),
});

const idParam = z.object({ id: z.string().uuid() });

export async function cmsRoutes(app: FastifyInstance) {
  // Registro canónico de bloques del page-builder (fuente: @platform/shared-types).
  app.get("/cms/blocks", async () => {
    return { types: BLOCK_TYPES, defaults: blockDefaults, total: BLOCK_TYPES.length };
  });

  app.get("/cms/pages", async (req) => {
    const rows = await db.select().from(pages).where(eq(pages.tenantId, tid(req))).orderBy(pages.title);
    return { data: rows, total: rows.length };
  });

  app.get("/cms/pages/by-slug/:slug", { schema: { params: z.object({ slug: z.string() }) } }, async (req, reply) => {
    const [p] = await db
      .select()
      .from(pages)
      .where(and(eq(pages.tenantId, tid(req)), eq(pages.slug, req.params.slug)))
      .limit(1);
    if (!p) return reply.notFound();
    return reply.send(p);
  });

  app.post("/cms/pages", { schema: { body: pageInput } }, async (req, reply) => {
    const [row] = await db
      .insert(pages)
      .values({ ...req.body, tenantId: tid(req), blocks: req.body.blocks ?? [] })
      .returning();
    return reply.send(row);
  });

  app.patch(
    "/cms/pages/:id",
    { schema: { params: idParam, body: pageInput.partial() } },
    async (req, reply) => {
      const [row] = await db
        .update(pages)
        .set({ ...req.body, updatedAt: new Date() })
        .where(and(eq(pages.tenantId, tid(req)), eq(pages.id, req.params.id)))
        .returning();
      if (!row) return reply.notFound();
      return reply.send(row);
    },
  );

  app.delete("/cms/pages/:id", { schema: { params: idParam } }, async (req, reply) => {
    const [row] = await db
      .delete(pages)
      .where(and(eq(pages.tenantId, tid(req)), eq(pages.id, req.params.id)))
      .returning();
    if (!row) return reply.notFound();
    return reply.send({ ok: true, id: row.id });
  });

  // ---- Settings (por tenant: PK compuesta (tenant_id, key)) ----
  app.get("/cms/settings/:key", { schema: { params: z.object({ key: z.string() }) } }, async (req, reply) => {
    const [s] = await db
      .select()
      .from(settings)
      .where(and(eq(settings.tenantId, tid(req)), eq(settings.key, req.params.key)))
      .limit(1);
    return reply.send(s ?? { key: req.params.key, value: null });
  });

  app.put(
    "/cms/settings/:key",
    { schema: { params: z.object({ key: z.string() }), body: z.object({ value: z.unknown() }) } },
    async (req, reply) => {
      await db
        .insert(settings)
        .values({ key: req.params.key, tenantId: tid(req), value: req.body.value })
        .onConflictDoUpdate({
          target: [settings.tenantId, settings.key],
          set: { value: req.body.value, updatedAt: new Date() },
        });
      return reply.send({ ok: true });
    },
  );
}
