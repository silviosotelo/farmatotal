import type { FastifyInstance } from "fastify";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { waLog, waTemplates, waWorkflows } from "../../db/schema";

const idParam = z.object({ id: z.string().uuid() });
const tplInput = z.object({
  name: z.string().min(1).max(120),
  category: z.string().max(60).optional(),
  content: z.string().min(1),
  active: z.boolean().optional(),
});
const wfInput = z.object({
  name: z.string().min(1).max(120),
  trigger: z.string().min(1).max(60),
  templateName: z.string().max(120).optional(),
  active: z.boolean().optional(),
});

export async function whatsappRoutes(app: FastifyInstance) {
  // Plantillas
  app.get("/plugins/whatsapp/templates", async () => {
    const rows = await db.select().from(waTemplates).orderBy(waTemplates.name);
    return { data: rows, total: rows.length };
  });
  app.post("/plugins/whatsapp/templates", { schema: { body: tplInput } }, async (req, reply) => {
    const [row] = await db.insert(waTemplates).values(req.body as any).returning();
    return reply.send(row);
  });
  app.patch("/plugins/whatsapp/templates/:id", { schema: { params: idParam, body: tplInput.partial() } }, async (req, reply) => {
    const [row] = await db.update(waTemplates).set({ ...(req.body as Record<string, unknown>), updatedAt: new Date() }).where(eq(waTemplates.id, (req.params as { id: string }).id)).returning();
    if (!row) return reply.notFound();
    return reply.send(row);
  });
  app.delete("/plugins/whatsapp/templates/:id", { schema: { params: idParam } }, async (req, reply) => {
    const [row] = await db.delete(waTemplates).where(eq(waTemplates.id, (req.params as { id: string }).id)).returning();
    if (!row) return reply.notFound();
    return reply.send({ ok: true });
  });

  // Workflows
  app.get("/plugins/whatsapp/workflows", async () => {
    const rows = await db.select().from(waWorkflows).orderBy(waWorkflows.name);
    return { data: rows, total: rows.length };
  });
  app.post("/plugins/whatsapp/workflows", { schema: { body: wfInput } }, async (req, reply) => {
    const [row] = await db.insert(waWorkflows).values(req.body as any).returning();
    return reply.send(row);
  });
  app.delete("/plugins/whatsapp/workflows/:id", { schema: { params: idParam } }, async (req, reply) => {
    const [row] = await db.delete(waWorkflows).where(eq(waWorkflows.id, (req.params as { id: string }).id)).returning();
    if (!row) return reply.notFound();
    return reply.send({ ok: true });
  });

  // Logs
  app.get("/plugins/whatsapp/log", async () => {
    const rows = await db.select().from(waLog).orderBy(desc(waLog.createdAt)).limit(200);
    return { data: rows, total: rows.length };
  });

  // Envío de prueba (registra en log; el envío real usa la config del plugin).
  app.post("/plugins/whatsapp/test", { schema: { body: z.object({ toPhone: z.string().min(5) }) } }, async (req, reply) => {
    const [row] = await db
      .insert(waLog)
      .values({ toPhone: (req.body as { toPhone: string }).toPhone, templateName: "test", body: "Mensaje de prueba", status: "queued" })
      .returning();
    return reply.send({ ok: true, id: row!.id });
  });
}
