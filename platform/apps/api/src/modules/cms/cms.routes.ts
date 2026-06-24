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

// ─── Templates ───
const templateInput = z.object({
  slug: z.string().min(1).max(250),
  title: z.string().min(1).max(300),
  category: z.string().optional(),
  thumbnail: z.string().optional(),
  blocks: z.unknown(),
});

export async function cmsRoutes(app: FastifyInstance) {
  // ─── Template Library ───
  app.get("/cms/templates", async (req) => {
    const tenantId = tid(req);
    const rows = await db.select().from(pages)
      .where(and(eq(pages.tenantId, tenantId), eq(pages.isTemplate, true)));
    return { data: rows };
  });

  app.post("/cms/templates", { schema: { body: templateInput } }, async (req, reply) => {
    const tenantId = tid(req);
    const body = req.body;
    const [row] = await db.insert(pages).values({
      tenantId,
      slug: body.slug,
      title: body.title,
      blocks: body.blocks,
      isTemplate: true,
      templateCategory: body.category ?? null,
      templateThumbnail: body.thumbnail ?? null,
      published: true,
    }).returning();
    return reply.status(201).send(row);
  });

  app.delete("/cms/templates/:id", { schema: { params: idParam } }, async (req, reply) => {
    const tenantId = tid(req);
    const { id } = req.params;
    await db.delete(pages).where(and(eq(pages.id, id), eq(pages.tenantId, tenantId)));
    return reply.status(204).send();
  });

  // Registro canónico de bloques del page-builder (fuente: @platform/shared-types).
  // El clone (proyecto separado) lo consume para validar su set de bloques.
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

  // ─── Global Widgets ───
  const globalWidgetInput = z.object({
    slug: z.string().min(1).max(250),
    title: z.string().min(1).max(300),
    blocks: z.unknown(),
  });

  app.get("/cms/global-widgets", async (req, reply) => {
    const rows = await db.select().from(pages)
      .where(and(eq(pages.tenantId, tid(req)), eq(pages.isGlobalWidget, true)));
    return reply.send({ data: rows });
  });

  app.post("/cms/global-widgets", async (req, reply) => {
    const body = globalWidgetInput.parse(req.body);
    const [row] = await db.insert(pages).values({
      tenantId: tid(req),
      slug: body.slug,
      title: body.title,
      blocks: body.blocks,
      isGlobalWidget: true,
      published: true,
    }).returning();
    return reply.status(201).send(row);
  });

  app.put("/cms/global-widgets/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = globalWidgetInput.partial().parse(req.body);
    const [row] = await db.update(pages).set(body)
      .where(and(eq(pages.id, id), eq(pages.tenantId, tid(req))))
      .returning();
    return reply.send(row);
  });

  app.delete("/cms/global-widgets/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    await db.delete(pages).where(and(eq(pages.id, id), eq(pages.tenantId, tid(req))));
    return reply.status(204).send();
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
