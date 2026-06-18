import type { FastifyInstance } from "fastify";
import { and, avg, count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { reviews, reviewStatus } from "../../db/schema";

const submitInput = z.object({
  productId: z.string().uuid(),
  author: z.string().min(1).max(120),
  email: z.string().email().max(200).optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  body: z.string().min(1).max(4000),
});

const idParam = z.object({ id: z.string().uuid() });

export async function reviewRoutes(app: FastifyInstance) {
  // Público: lista valoraciones aprobadas de un producto + resumen (promedio/conteo).
  app.get(
    "/reviews",
    { schema: { querystring: z.object({ productId: z.string().uuid().optional(), status: z.enum(reviewStatus).optional(), page: z.coerce.number().int().min(1).optional(), perPage: z.coerce.number().int().min(1).max(100).optional() }) } },
    async (req) => {
      const q = req.query;
      const where = and(
        q.productId ? eq(reviews.productId, q.productId) : undefined,
        // Por defecto sólo aprobadas (vista pública). Admin pasa status explícito.
        eq(reviews.status, q.status ?? "approved"),
      );
      const page = q.page ?? 1;
      const perPage = q.perPage ?? 20;
      const rows = await db
        .select()
        .from(reviews)
        .where(where)
        .orderBy(desc(reviews.createdAt))
        .limit(perPage)
        .offset((page - 1) * perPage);
      const [agg = { c: 0, a: null }] = await db
        .select({ c: count(), a: avg(reviews.rating) })
        .from(reviews)
        .where(where);
      return {
        data: rows,
        total: Number(agg.c),
        average: agg.a ? Math.round(Number(agg.a) * 10) / 10 : 0,
        page,
        perPage,
      };
    },
  );

  // Admin: lista todas (cualquier estado) — sin filtro de status por defecto.
  app.get(
    "/reviews/all",
    { schema: { querystring: z.object({ status: z.enum(reviewStatus).optional(), page: z.coerce.number().int().min(1).optional(), perPage: z.coerce.number().int().min(1).max(100).optional() }) } },
    async (req) => {
      const q = req.query;
      const where = q.status ? eq(reviews.status, q.status) : undefined;
      const page = q.page ?? 1;
      const perPage = q.perPage ?? 50;
      const [{ c } = { c: 0 }] = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(reviews)
        .where(where);
      const rows = await db
        .select()
        .from(reviews)
        .where(where)
        .orderBy(desc(reviews.createdAt))
        .limit(perPage)
        .offset((page - 1) * perPage);
      return { data: rows, total: c, page, perPage, totalPages: Math.ceil(c / perPage) };
    },
  );

  // Público: enviar una valoración (queda pendiente de moderación).
  app.post("/reviews", { schema: { body: submitInput } }, async (req, reply) => {
    const [row] = await db
      .insert(reviews)
      .values({ ...req.body, status: "pending" })
      .returning();
    return reply.send({ id: row!.id, status: row!.status });
  });

  // Admin: moderar (aprobar/rechazar).
  app.patch(
    "/reviews/:id",
    { schema: { params: idParam, body: z.object({ status: z.enum(reviewStatus) }) } },
    async (req, reply) => {
      const [row] = await db
        .update(reviews)
        .set({ status: req.body.status, updatedAt: new Date() })
        .where(eq(reviews.id, req.params.id))
        .returning();
      if (!row) return reply.notFound();
      return reply.send(row);
    },
  );

  // Admin: borrar.
  app.delete("/reviews/:id", { schema: { params: idParam } }, async (req, reply) => {
    const [row] = await db.delete(reviews).where(eq(reviews.id, req.params.id)).returning();
    if (!row) return reply.notFound();
    return reply.send({ ok: true });
  });
}
