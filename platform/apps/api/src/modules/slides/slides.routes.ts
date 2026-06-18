import type { FastifyInstance } from "fastify";
import { and, asc, eq, lte, gte, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { slides } from "../../db/schema";

const slideInput = z.object({
  title: z.string().min(1).max(200),
  imageDesktop: z.string().nullable().optional(),
  imageMobile: z.string().nullable().optional(),
  linkHref: z.string().nullable().optional(),
  days: z.array(z.number().int().min(0).max(6)).optional(),
  position: z.number().int().optional(),
  active: z.boolean().optional(),
  dateFrom: z.string().nullable().optional(),
  dateTo: z.string().nullable().optional(),
});

const idParam = z.object({ id: z.string().uuid() });

function toDate(v?: string | null) {
  return v ? new Date(v) : null;
}

export async function slidesRoutes(app: FastifyInstance) {
  // Admin: todos
  app.get("/slides", async () => {
    const rows = await db.select().from(slides).orderBy(asc(slides.position));
    return { data: rows, total: rows.length };
  });

  // Público: slides del día de hoy (filtra día + ventana de fechas + activo)
  app.get("/slides/today", async () => {
    const now = new Date();
    const dow = now.getDay(); // 0=domingo
    const rows = await db
      .select()
      .from(slides)
      .where(
        and(
          eq(slides.active, true),
          or(isNull(slides.dateFrom), lte(slides.dateFrom, now)),
          or(isNull(slides.dateTo), gte(slides.dateTo, now)),
          // days vacío = todos los días, o contiene el día actual
          or(
            sql`jsonb_array_length(${slides.days}) = 0`,
            sql`${slides.days} @> ${JSON.stringify([dow])}::jsonb`,
          ),
        ),
      )
      .orderBy(asc(slides.position));
    return { data: rows, day: dow };
  });

  app.post("/slides", { schema: { body: slideInput } }, async (req, reply) => {
    const b = req.body;
    const [row] = await db
      .insert(slides)
      .values({
        ...b,
        days: b.days ?? [],
        dateFrom: toDate(b.dateFrom),
        dateTo: toDate(b.dateTo),
      })
      .returning();
    return reply.send(row);
  });

  app.patch(
    "/slides/:id",
    { schema: { params: idParam, body: slideInput.partial() } },
    async (req, reply) => {
      const b = req.body;
      const patch: Record<string, unknown> = { ...b, updatedAt: new Date() };
      if (b.dateFrom !== undefined) patch.dateFrom = toDate(b.dateFrom);
      if (b.dateTo !== undefined) patch.dateTo = toDate(b.dateTo);
      const [row] = await db
        .update(slides)
        .set(patch)
        .where(eq(slides.id, req.params.id))
        .returning();
      if (!row) return reply.notFound();
      return reply.send(row);
    },
  );

  app.delete("/slides/:id", { schema: { params: idParam } }, async (req, reply) => {
    await db.delete(slides).where(eq(slides.id, req.params.id));
    return reply.send({ ok: true });
  });
}
