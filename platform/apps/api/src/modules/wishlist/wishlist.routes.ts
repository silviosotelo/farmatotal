import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { productImages, products, wishlist } from "../../db/schema";

/** Verifica el JWT y devuelve el id de usuario (sub), o null si no hay sesión válida. */
async function requireUser(req: FastifyRequest, reply: FastifyReply): Promise<string | null> {
  try {
    await req.jwtVerify();
  } catch {
    reply.unauthorized("Iniciá sesión para usar tu lista de deseos");
    return null;
  }
  const sub = (req.user as { sub?: string })?.sub;
  if (!sub) {
    reply.unauthorized("Sesión inválida");
    return null;
  }
  return sub;
}

/** DTO de producto para la lista de deseos (alineado con lo que consume el storefront). */
function toProductDTO(r: typeof products.$inferSelect) {
  return {
    id: r.id,
    sku: r.sku,
    codInterno: r.codInterno ?? null,
    slug: r.slug,
    title: r.title,
    description: r.description ?? null,
    brandId: r.brandId ?? null,
    categoryId: r.categoryId ?? null,
    priceNormal: r.priceNormal,
    priceWeb: r.priceWeb,
    onPromo: r.onPromo,
    controlled: r.controlled,
    featured: r.featured,
    status: r.status,
    stockCached: r.stockCached,
    custom: r.custom ?? null,
  };
}

const productIdBody = z.object({ productId: z.string().uuid() });
const productIdParam = z.object({ productId: z.string().uuid() });

export async function wishlistRoutes(app: FastifyInstance) {
  // Lista de deseos del usuario autenticado (con imagen primaria de cada producto).
  app.get("/wishlist", { onRequest: async (req, reply) => void (await requireUser(req, reply)) }, async (req, reply) => {
    const userId = (req.user as { sub?: string })?.sub;
    if (!userId) return; // requireUser ya respondió 401

    const rows = await db
      .select({ product: products })
      .from(wishlist)
      .innerJoin(products, eq(products.id, wishlist.productId))
      .where(eq(wishlist.userId, userId))
      .orderBy(desc(wishlist.createdAt));

    const ids = rows.map((r) => r.product.id);
    const imgs = ids.length
      ? await db
          .select()
          .from(productImages)
          .where(inArray(productImages.productId, ids))
          .orderBy(asc(productImages.position))
      : [];
    const imgByProduct = new Map<string, (typeof imgs)[number]>();
    for (const im of imgs) if (!imgByProduct.has(im.productId)) imgByProduct.set(im.productId, im);

    return reply.send({
      data: rows.map((r) => {
        const dto = toProductDTO(r.product);
        const im = imgByProduct.get(r.product.id);
        return im
          ? { ...dto, images: [{ url: im.url, alt: im.alt ?? null, isPrimary: im.isPrimary, position: im.position }] }
          : dto;
      }),
    });
  });

  // Agrega un producto a la lista (idempotente). La mutación ya exige JWT por el guard global.
  app.post("/wishlist", { schema: { body: productIdBody } }, async (req, reply) => {
    const userId = (req.user as { sub?: string })?.sub;
    if (!userId) return reply.unauthorized("Sesión inválida");
    const { productId } = req.body as z.infer<typeof productIdBody>;

    const [p] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
    if (!p) return reply.notFound("Producto no encontrado");

    await db.insert(wishlist).values({ userId, productId }).onConflictDoNothing();
    return reply.send({ ok: true });
  });

  // Quita un producto de la lista.
  app.delete("/wishlist/:productId", { schema: { params: productIdParam } }, async (req, reply) => {
    const userId = (req.user as { sub?: string })?.sub;
    if (!userId) return reply.unauthorized("Sesión inválida");
    const { productId } = req.params as z.infer<typeof productIdParam>;

    await db
      .delete(wishlist)
      .where(and(eq(wishlist.userId, userId), eq(wishlist.productId, productId)));
    return reply.send({ ok: true });
  });
}
