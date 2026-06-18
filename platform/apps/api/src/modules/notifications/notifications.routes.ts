import type { FastifyInstance } from "fastify";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { reviews } from "../../db/schema";

/**
 * Notificaciones del admin (campanita del header de Ecme).
 * Señal real: valoraciones pendientes de moderación.
 */
export async function notificationRoutes(app: FastifyInstance) {
  app.get("/notification/count", async () => {
    const [{ c } = { c: 0 }] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(reviews)
      .where(eq(reviews.status, "pending"));
    return { count: c };
  });

  app.get("/notification/list", async () => {
    const rows = await db
      .select()
      .from(reviews)
      .where(eq(reviews.status, "pending"))
      .orderBy(desc(reviews.createdAt))
      .limit(15);
    return rows.map((r) => ({
      id: r.id,
      target: r.author,
      description: `Valoración pendiente (${r.rating}★): ${(r.title || r.body).slice(0, 80)}`,
      date: r.createdAt.toISOString(),
      image: "",
      type: 0,
      location: "/concepts/reviews",
      locationLabel: "Valoraciones",
      status: "",
      readed: false,
    }));
  });
}
