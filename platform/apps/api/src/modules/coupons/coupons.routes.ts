import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { coupons } from "../../db/schema";
import { tid } from "../../plugins/tenant";

const couponInput = z.object({
  code: z.string().min(1).max(60),
  type: z.enum(["percent", "fixed"]).optional(),
  value: z.number().int().positive(),
  minSubtotal: z.number().int().nonnegative().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  active: z.boolean().optional(),
});

const idParam = z.object({ id: z.string().uuid() });

export async function couponRoutes(app: FastifyInstance) {
  app.get("/coupons", async (req) => {
    const rows = await db.select().from(coupons).where(eq(coupons.tenantId, tid(req))).orderBy(coupons.code);
    return { data: rows, total: rows.length };
  });

  app.post("/coupons", { schema: { body: couponInput } }, async (req, reply) => {
    const [row] = await db.insert(coupons).values({ ...req.body, tenantId: tid(req) }).returning();
    return reply.send(row);
  });

  app.patch(
    "/coupons/:id",
    { schema: { params: idParam, body: couponInput.partial() } },
    async (req, reply) => {
      const [row] = await db
        .update(coupons)
        .set({ ...req.body, updatedAt: new Date() })
        .where(and(eq(coupons.tenantId, tid(req)), eq(coupons.id, req.params.id)))
        .returning();
      if (!row) return reply.notFound();
      return reply.send(row);
    },
  );

  // Validar cupon (lo usa el store en el carrito)
  app.get("/coupons/validate/:code", { schema: { params: z.object({ code: z.string() }) } }, async (req, reply) => {
    const [c] = await db
      .select()
      .from(coupons)
      .where(and(eq(coupons.tenantId, tid(req)), eq(coupons.code, req.params.code)))
      .limit(1);
    if (!c || !c.active) return reply.send({ valid: false });
    if (c.maxUses && c.usedCount >= c.maxUses) return reply.send({ valid: false });
    return reply.send({ valid: true, type: c.type, value: c.value, minSubtotal: c.minSubtotal });
  });
}
