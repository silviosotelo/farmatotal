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
    const page = req.query.page ?? 1;
    const perPage = req.query.perPage ?? 50;
    const q = req.query.q?.trim();
    const where = and(
      eq(customers.tenantId, tid(req)),
      q
        ? or(
            ilike(customers.email, `%${q}%`),
            ilike(customers.razonSocial, `%${q}%`),
            ilike(customers.docNumber, `%${q}%`),
            ilike(customers.firstName, `%${q}%`),
            ilike(customers.lastName, `%${q}%`),
          )
        : undefined,
    );
    const [{ count }] = await db
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
      .where(and(eq(customers.id, req.params.id), eq(customers.tenantId, tid(req))));
    if (!row) return reply.notFound();
    return reply.send(row);
  });

  app.post("/customers", { schema: { body: customerInput } }, async (req, reply) => {
    const [row] = await db
      .insert(customers)
      .values({ ...req.body, tenantId: tid(req) })
      .returning();
    return reply.send(row);
  });

  app.patch(
    "/customers/:id",
    { schema: { params: idParam, body: customerInput.partial() } },
    async (req, reply) => {
      const [row] = await db
        .update(customers)
        .set({ ...req.body, updatedAt: new Date() })
        .where(and(eq(customers.id, req.params.id), eq(customers.tenantId, tid(req))))
        .returning();
      if (!row) return reply.notFound();
      return reply.send(row);
    },
  );
}
