import type { FastifyInstance } from "fastify";

export async function slidesRoutes(app: FastifyInstance) {
  // TODO: slides table was removed in V2 schema. Slides are now stored as posts WHERE post_type = 'slide'.
  // This module needs to be rewritten to use the posts table.
  const notImplemented = async () => ({ error: "Not implemented — slides migrated to posts table (post_type='slide')" });

  app.get("/slides", notImplemented);
  app.get("/slides/today", notImplemented);
  app.post("/slides", notImplemented);
  app.patch("/slides/:id", notImplemented);
  app.delete("/slides/:id", notImplemented);
}
