import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { db } from "../../db/client.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ ok: true, ts: new Date().toISOString() }));

  app.get("/health/db", async (_req, reply) => {
    try {
      await db.execute(sql`SELECT 1`);
      return reply.send({ ok: true });
    } catch (e) {
      return reply.code(500).send({ ok: false, error: (e as Error).message });
    }
  });
}
