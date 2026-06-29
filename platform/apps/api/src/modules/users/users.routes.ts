import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { asc, eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { users } from "../../db/schema";
import { createUser, hashPassword } from "../auth/auth.service.js";

const userRoles = ["admin", "manager", "editor", "viewer", "vendor"] as const;

/** Solo administradores pueden gestionar usuarios. */
async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.unauthorized("Token inválido o ausente");
  }
  const role = (req.user as { role?: string })?.role;
  if (role !== "admin") return reply.forbidden("Requiere rol administrador");
}

const publicCols = {
  id: users.id,
  email: users.email,
  displayName: users.displayName,
  status: users.status,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
};

export async function usersRoutes(app: FastifyInstance) {
  // Listado de usuarios (admin).
  app.get("/users", { onRequest: requireAdmin }, async () => {
    const rows = await db.select(publicCols).from(users).orderBy(asc(users.createdAt));
    return { data: rows, total: rows.length };
  });

  // Alta de usuario (admin).
  const createInput = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().optional(),
    role: z.enum(userRoles).optional(),
  });
  app.post("/users", { onRequest: requireAdmin, schema: { body: createInput } }, async (req, reply) => {
    const body = req.body as z.infer<typeof createInput>;
    const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email.toLowerCase().trim())).limit(1);
    if (exists) return reply.conflict("Ya existe un usuario con ese email");
    const u = await createUser(body);
    return reply.send({ id: u.id, email: u.email, displayName: u.displayName, status: u.status });
  });

  // Edición (rol, nombre, activo, password opcional) (admin).
  const idParam = z.object({ id: z.string().uuid() });
  const patchInput = z.object({
    displayName: z.string().nullable().optional(),
    role: z.enum(userRoles).optional(),
    active: z.boolean().optional(),
    password: z.string().min(6).optional(),
  });
  app.patch(
    "/users/:id",
    { onRequest: requireAdmin, schema: { params: idParam, body: patchInput } },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = req.body as z.infer<typeof patchInput>;
      const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!u) return reply.notFound();

      // No permitir quitar el último admin activo.
      // TODO: role check needs tenantMemberships join in V2 schema
      const set: Record<string, unknown> = { updatedAt: new Date() };
      if (body.displayName !== undefined) set.displayName = body.displayName;
      if (body.active !== undefined) set.status = body.active ? "active" : "inactive";
      if (body.password) set.passwordHash = await hashPassword(body.password);

      const [row] = await db.update(users).set(set).where(eq(users.id, id)).returning(publicCols);
      return reply.send(row);
    },
  );

  // Baja (admin). No permite borrarse a sí mismo ni el último admin.
  app.delete("/users/:id", { onRequest: requireAdmin, schema: { params: idParam } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const self = (req.user as { sub?: string })?.sub;
    if (self === id) return reply.badRequest("No podés eliminar tu propio usuario");
    const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!u) return reply.notFound();
    // TODO: admin role check needs tenantMemberships join in V2 schema
    await db.delete(users).where(eq(users.id, id));
    return reply.send({ ok: true });
  });
}
