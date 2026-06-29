import type { FastifyInstance } from "fastify";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { customers } from "../../db/schema";
import { tid } from "../../plugins/tenant";

const customerInput = z.object({
  email: z.string().email().nullable().optional(),
  firstName: z.string().max(120).nullable().optional(),
  lastName: z.string().max(120).nullable().optional(),
  razonSocial: z.string().max(200).nullable().optional(),
  docType: z.enum(["CI", "RUC"]).nullable().optional(),
  docNumber: z.string().max(40).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  active: z.boolean().optional(),
});

const idParam = z.object({ id: z.string().uuid() });
const listQuery = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  perPage: z.coerce.number().int().positive().max(200).optional(),
});

export async function customerRoutes(app: FastifyInstance) {
  app.get("/customers", { schema: { querystring: listQuery } }, async (req) => {
    const params = req.query as z.infer<typeof listQuery>;
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 50;
    const q = params.q?.trim();
    const where = q
      ? or(
          ilike(customers.email, `%${q}%`),
          ilike(customers.razonSocial, `%${q}%`),
          ilike(customers.docNumber, `%${q}%`),
          ilike(customers.firstName, `%${q}%`),
          ilike(customers.lastName, `%${q}%`),
        )
      : undefined;
    const [{ count } = { count: 0 }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(customers)
      .where(where);
    const rows = await db
      .select()
      .from(customers)
      .where(where)
      .orderBy(customers.createdAt)
      .limit(perPage)
      .offset((page - 1) * perPage);
    return { data: rows, page, perPage, total: count, totalPages: Math.ceil(count / perPage) };
  });

  app.get("/customers/:id", { schema: { params: idParam } }, async (req, reply) => {
    const [row] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, (req.params as { id: string }).id));
    if (!row) return reply.notFound();
    return reply.send(row);
  });

  app.post("/customers", { schema: { body: customerInput } }, async (req, reply) => {
    const [row] = await db
      .insert(customers)
      .values(req.body as z.infer<typeof customerInput>)
      .returning();
    return reply.send(row);
  });

  app.patch(
    "/customers/:id",
    { schema: { params: idParam, body: customerInput.partial() } },
    async (req, reply) => {
      const [row] = await db
        .update(customers)
        .set({ ...(req.body as Record<string, unknown>), updatedAt: new Date() })
        .where(eq(customers.id, (req.params as { id: string }).id))
        .returning();
      if (!row) return reply.notFound();
      return reply.send(row);
    },
  );
}
