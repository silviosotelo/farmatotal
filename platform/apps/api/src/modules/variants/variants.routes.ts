import type { FastifyInstance } from "fastify";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { productVariants, products } from "../../db/schema";
import { tid } from "../../plugins/tenant";

const variantInput = z.object({
  productId: z.string().uuid(),
  sku: z.string().min(1).max(80),
  title: z.string().min(1).max(250),
  attributes: z.record(z.string(), z.string()).optional(),
  priceNormal: z.number().int().nonnegative().optional(),
  priceWeb: z.number().int().nonnegative().optional(),
  stockCached: z.number().int().nonnegative().optional(),
  imageUrl: z.string().optional(),
  position: z.number().int().optional(),
  active: z.boolean().optional(),
});

const idParam = z.object({ id: z.string().uuid() });

export async function variantRoutes(app: FastifyInstance) {
  // Público: variantes activas de un producto (para la ficha).
  app.get(
    "/catalog/products/:id/variants",
    { schema: { params: idParam, querystring: z.object({ all: z.coerce.boolean().optional() }) } },
    async (req) => {
      const onlyActive = !(req.query as { all?: boolean }).all;
      const rows = await db
        .select()
        .from(productVariants)
        .where(
          and(
            eq(productVariants.productId, (req.params as { id: string }).id),
            onlyActive ? eq(productVariants.active, true) : undefined,
          ),
        )
        .orderBy(asc(productVariants.position), asc(productVariants.title));
      return { data: rows, total: rows.length };
    },
  );

  // Admin: crear variante.
  app.post("/catalog/variants", { schema: { body: variantInput } }, async (req, reply) => {
    const body = req.body as z.infer<typeof variantInput>;
    const [parent] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, body.productId), eq(products.tenantId, tid(req))))
      .limit(1);
    if (!parent) return reply.notFound("Producto no encontrado");
    const [row] = await db
      .insert(productVariants)
      .values(body as any)
      .returning();
    return reply.send(row);
  });

  // Admin: actualizar.
  app.patch(
    "/catalog/variants/:id",
    { schema: { params: idParam, body: variantInput.partial() } },
    async (req, reply) => {
      const [row] = await db
        .update(productVariants)
        .set({ ...(req.body as Record<string, unknown>), updatedAt: new Date() })
        .where(eq(productVariants.id, (req.params as { id: string }).id))
        .returning();
      if (!row) return reply.notFound();
      return reply.send(row);
    },
  );

  // Admin: borrar.
  app.delete("/catalog/variants/:id", { schema: { params: idParam } }, async (req, reply) => {
    const [row] = await db
      .delete(productVariants)
      .where(eq(productVariants.id, (req.params as { id: string }).id))
      .returning();
    if (!row) return reply.notFound();
    return reply.send({ ok: true });
  });
}
