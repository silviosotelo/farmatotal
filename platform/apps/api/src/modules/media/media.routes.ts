import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { media } from "../../db/schema";
import { env } from "../../env.js";
import { tid } from "../../plugins/tenant";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
};

const registerInput = z.object({
  url: z.string().url(),
  filename: z.string().max(300).optional(),
  altText: z.string().max(300).optional(),
});

const uploadInput = z.object({
  filename: z.string().min(1).max(300),
  mimeType: z.string().min(1).max(120),
  dataBase64: z.string().min(1),
  altText: z.string().max(300).optional(),
});

const idParam = z.object({ id: z.string().uuid() });

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

export async function mediaRoutes(app: FastifyInstance) {
  app.get(
    "/media",
    { schema: { querystring: z.object({ page: z.coerce.number().int().min(1).optional(), perPage: z.coerce.number().int().min(1).max(100).optional() }) } },
    async (req) => {
      const q = req.query as { page?: number; perPage?: number };
      const page = q.page ?? 1;
      const perPage = q.perPage ?? 40;
      const [{ c } = { c: 0 }] = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(media)
        .where(eq(media.tenantId, tid(req)));
      const rows = await db
        .select()
        .from(media)
        .where(eq(media.tenantId, tid(req)))
        .orderBy(desc(media.createdAt))
        .limit(perPage)
        .offset((page - 1) * perPage);
      return { data: rows, total: c, page, perPage, totalPages: Math.ceil(c / perPage) };
    },
  );

  app.post("/media/register", { schema: { body: registerInput } }, async (req, reply) => {
    const b = req.body as z.infer<typeof registerInput>;
    const [row] = await db
      .insert(media)
      .values({
        tenantId: tid(req),
        url: b.url,
        filename: b.filename ?? b.url.split("/").pop() ?? "external",
        storageDriver: "external",
        altText: b.altText ?? null,
      })
      .returning();
    return reply.send(row);
  });

  app.post(
    "/media/upload",
    { schema: { body: uploadInput }, bodyLimit: 20 * 1024 * 1024 },
    async (req, reply) => {
      const b = req.body as z.infer<typeof uploadInput>;
      const ext = MIME_EXT[b.mimeType];
      if (!ext) return reply.badRequest(`MIME no soportado: ${b.mimeType}`);
      const raw = b.dataBase64.includes(",") ? b.dataBase64.split(",")[1]! : b.dataBase64;
      const buf = Buffer.from(raw, "base64");
      if (!buf.length) return reply.badRequest("base64 vacío o inválido");

      await mkdir(UPLOAD_DIR, { recursive: true });
      const t = process.hrtime.bigint().toString(36);
      const name = `${t}-${safeName(b.filename.replace(/\.[^.]+$/, ""))}.${ext}`;
      await writeFile(path.join(UPLOAD_DIR, name), buf);

      const url = `${env.PUBLIC_API_URL}/media/file/${name}`;
      const [row] = await db
        .insert(media)
        .values({
          tenantId: tid(req),
          url,
          filename: b.filename,
          mimeType: b.mimeType,
          size: buf.length,
          storageDriver: "local",
          storagePath: path.join(UPLOAD_DIR, name),
          altText: b.altText ?? null,
        })
        .returning();
      return reply.send(row);
    },
  );

  app.get("/media/file/:name", { schema: { params: z.object({ name: z.string() }) } }, async (req, reply) => {
    const name = safeName((req.params as { name: string }).name);
    const full = path.join(UPLOAD_DIR, name);
    try {
      const s = await stat(full);
      if (!s.isFile()) return reply.notFound();
    } catch {
      return reply.notFound();
    }
    const ext = name.split(".").pop() ?? "";
    const mime = Object.entries(MIME_EXT).find(([, e]) => e === ext)?.[0] ?? "application/octet-stream";
    reply.header("Cache-Control", "public, max-age=31536000, immutable");
    reply.type(mime);
    return reply.send(createReadStream(full));
  });

  app.delete("/media/:id", { schema: { params: idParam } }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const [row] = await db
      .delete(media)
      .where(and(eq(media.id, id), eq(media.tenantId, tid(req))))
      .returning();
    if (!row) return reply.notFound();
    if (row.storageDriver === "local" && row.storagePath) {
      await unlink(row.storagePath).catch(() => {});
    }
    return reply.send({ ok: true });
  });
}
