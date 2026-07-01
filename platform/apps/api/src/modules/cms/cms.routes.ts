import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { BLOCK_TYPES, blockDefaults } from "@platform/shared-types";
import { db } from "../../db/client";
import { posts, options } from "../../db/schema";
import { tid } from "../../plugins/tenant";

const CMS_POST_TYPE = "cms_block" as const;

const pageInput = z.object({
  slug: z.string().min(1).max(250),
  title: z.string().min(1).max(300),
  content: z.string().optional(),
  status: z.enum(["draft", "publish", "private", "trash"]).optional(),
  seo: z.object({ title: z.string().optional(), description: z.string().optional() }).optional(),
});

const idParam = z.object({ id: z.string().uuid() });

export async function cmsRoutes(app: FastifyInstance) {
  // Registro canónico de bloques del page-builder (fuente: @platform/shared-types).
  app.get("/cms/blocks", async () => {
    return { types: BLOCK_TYPES, defaults: blockDefaults, total: BLOCK_TYPES.length };
  });

  app.get("/cms/pages", async (req) => {
    const rows = await db
      .select()
      .from(posts)
      .where(and(eq(posts.tenantId, tid(req)), eq(posts.postType, CMS_POST_TYPE)))
      .orderBy(posts.title);
    return { data: rows, total: rows.length };
  });

  app.get("/cms/pages/by-slug/:slug", { schema: { params: z.object({ slug: z.string() }) } }, async (req, reply) => {
    const [p] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.tenantId, tid(req)), eq(posts.slug, (req.params as { slug: string }).slug)))
      .limit(1);
    if (!p) return reply.notFound();
    // Map V2 posts schema to BackendPage shape expected by the store
    let blocks: unknown = [];
    try { blocks = JSON.parse(p.content || "[]"); } catch { blocks = []; }
    return reply.send({
      id: p.id,
      slug: p.slug,
      title: p.title,
      blocks,
      published: p.status === "publish",
      seo: null,
    });
  });

  app.post("/cms/pages", { schema: { body: pageInput } }, async (req, reply) => {
    const [row] = await db
      .insert(posts)
      .values({ ...(req.body as z.infer<typeof pageInput>), tenantId: tid(req), postType: CMS_POST_TYPE })
      .returning();
    return reply.send(row);
  });

  app.patch(
    "/cms/pages/:id",
    { schema: { params: idParam, body: pageInput.partial() } },
    async (req, reply) => {
      const [row] = await db
        .update(posts)
        .set({ ...(req.body as Record<string, unknown>), updatedAt: new Date() })
        .where(and(eq(posts.tenantId, tid(req)), eq(posts.id, (req.params as { id: string }).id)))
        .returning();
      if (!row) return reply.notFound();
      return reply.send(row);
    },
  );

  app.delete("/cms/pages/:id", { schema: { params: idParam } }, async (req, reply) => {
    const [row] = await db
      .delete(posts)
      .where(and(eq(posts.tenantId, tid(req)), eq(posts.id, (req.params as { id: string }).id)))
      .returning();
    if (!row) return reply.notFound();
    return reply.send({ ok: true, id: row.id });
  });

  // ---- Settings (por tenant: PK compuesta (tenant_id, name)) ----
  app.get("/cms/settings/:key", { schema: { params: z.object({ key: z.string() }) } }, async (req, reply) => {
    const [s] = await db
      .select()
      .from(options)
      .where(and(eq(options.tenantId, tid(req)), eq(options.name, (req.params as { key: string }).key)))
      .limit(1);
    return reply.send(s ?? { name: (req.params as { key: string }).key, value: null });
  });

  app.put(
    "/cms/settings/:key",
    { schema: { params: z.object({ key: z.string() }), body: z.object({ value: z.unknown() }) } },
    async (req, reply) => {
      await db
        .insert(options)
        .values({ name: (req.params as { key: string }).key, tenantId: tid(req), value: (req.body as { value: unknown }).value })
        .onConflictDoUpdate({
          target: [options.tenantId, options.name],
          set: { value: (req.body as { value: unknown }).value, updatedAt: new Date() },
        });
      return reply.send({ ok: true });
    },
  );
}
