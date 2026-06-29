import type { FastifyInstance } from "fastify";

export async function wishlistRoutes(app: FastifyInstance) {
  // TODO: wishlist table was removed in V2 schema. Needs to be reimplemented (e.g. using customer_meta or a dedicated table).
  const notImplemented = async () => ({ error: "Not implemented — wishlist table removed in V2 schema" });

  app.get("/wishlist", notImplemented);
  app.post("/wishlist", notImplemented);
  app.delete("/wishlist/:productId", notImplemented);
}
