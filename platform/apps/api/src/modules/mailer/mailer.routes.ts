import type { FastifyInstance } from "fastify";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { emailLog, emailQueue, emailTemplates, settings } from "../../db/schema";
import { enqueueEmail, getMailerConfig, processQueue } from "../../services/mailer.js";
import { tid } from "../../plugins/tenant";

const tplInput = z.object({
  key: z.string().min(1).max(80),
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(300),
  bodyHtml: z.string().min(1),
  variables: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});
const idParam = z.object({ id: z.string().uuid() });

export async function mailerRoutes(app: FastifyInstance) {
  // ── Plantillas ──
  app.get("/mailer/templates", async () => {
    const rows = await db.select().from(emailTemplates).orderBy(emailTemplates.name);
    return { data: rows, total: rows.length };
  });
  app.post("/mailer/templates", { schema: { body: tplInput } }, async (req, reply) => {
    const [row] = await db.insert(emailTemplates).values(req.body).returning();
    return reply.send(row);
  });
  app.patch(
    "/mailer/templates/:id",
    { schema: { params: idParam, body: tplInput.partial() } },
    async (req, reply) => {
      const [row] = await db
        .update(emailTemplates)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(emailTemplates.id, req.params.id))
        .returning();
      if (!row) return reply.notFound();
      return reply.send(row);
    },
  );
  app.delete("/mailer/templates/:id", { schema: { params: idParam } }, async (req, reply) => {
    const [row] = await db.delete(emailTemplates).where(eq(emailTemplates.id, req.params.id)).returning();
    if (!row) return reply.notFound();
    return reply.send({ ok: true });
  });

  // ── Cola ──
  app.get(
    "/mailer/queue",
    { schema: { querystring: z.object({ status: z.string().optional(), limit: z.coerce.number().optional() }) } },
    async (req) => {
      const q = req.query;
      const rows = await db
        .select()
        .from(emailQueue)
        .orderBy(desc(emailQueue.createdAt))
        .limit(q.limit ?? 100);
      const data = q.status ? rows.filter((r) => r.status === q.status) : rows;
      return { data, total: data.length };
    },
  );
  // Reintentar un job (vuelve a pending).
  app.post("/mailer/queue/:id/retry", { schema: { params: idParam } }, async (req, reply) => {
    const [row] = await db
      .update(emailQueue)
      .set({ status: "pending", lastError: null })
      .where(eq(emailQueue.id, req.params.id))
      .returning();
    if (!row) return reply.notFound();
    return reply.send(row);
  });
  // Procesar la cola manualmente.
  app.post("/mailer/process", async () => {
    return processQueue(25);
  });

  // ── Logs ──
  app.get("/mailer/log", async () => {
    const rows = await db.select().from(emailLog).orderBy(desc(emailLog.createdAt)).limit(200);
    return { data: rows, total: rows.length };
  });

  // ── Config ──
  app.get("/mailer/config", async (req) => getMailerConfig(tid(req)));
  app.put(
    "/mailer/config",
    { schema: { body: z.record(z.string(), z.unknown()) } },
    async (req, reply) => {
      await db
        .insert(settings)
        .values({ tenantId: tid(req), key: "mod_mailer", value: req.body })
        .onConflictDoUpdate({ target: [settings.tenantId, settings.key], set: { value: req.body, updatedAt: new Date() } });
      return reply.send({ ok: true });
    },
  );

  // ── Test: encola un email de prueba ──
  app.post(
    "/mailer/test",
    { schema: { body: z.object({ toEmail: z.string().email() }) } },
    async (req, reply) => {
      const job = await enqueueEmail({
        toEmail: req.body.toEmail,
        subject: "Email de prueba",
        bodyHtml: "<h2>Funciona ✔</h2><p>Este es un email de prueba de la plataforma.</p>",
      });
      const res = await processQueue(5);
      return reply.send({ queued: job.id, processed: res });
    },
  );
}
