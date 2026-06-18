import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { asc, eq, ne, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { users, roles } from "../../db/schema/users";
import { createUser, hashPassword } from "../auth/auth.service.js";

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
  name: users.name,
  role: users.role,
  active: users.active,
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
    role: z.enum(roles).optional(),
  });
  app.post("/users", { onRequest: requireAdmin, schema: { body: createInput } }, async (req, reply) => {
    const body = req.body as z.infer<typeof createInput>;
    const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email.toLowerCase().trim())).limit(1);
    if (exists) return reply.conflict("Ya existe un usuario con ese email");
    const u = await createUser(body);
    return reply.send({ id: u.id, email: u.email, name: u.name, role: u.role, active: u.active });
  });

  // Edición (rol, nombre, activo, password opcional) (admin).
  const idParam = z.object({ id: z.string().uuid() });
  const patchInput = z.object({
    name: z.string().nullable().optional(),
    role: z.enum(roles).optional(),
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
      if (u.role === "admin" && ((body.role && body.role !== "admin") || body.active === false)) {
        const activeAdmins = await db
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.role, "admin"), eq(users.active, true)));
        if (activeAdmins.length <= 1) {
          return reply.badRequest("No se puede dejar la plataforma sin administradores activos");
        }
      }

      const set: Record<string, unknown> = { updatedAt: new Date() };
      if (body.name !== undefined) set.name = body.name;
      if (body.role !== undefined) set.role = body.role;
      if (body.active !== undefined) set.active = body.active;
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
    if (u.role === "admin") {
      const remaining = await db.select({ id: users.id }).from(users).where(and(eq(users.role, "admin"), ne(users.id, id)));
      if (remaining.length === 0) return reply.badRequest("No se puede eliminar el último administrador");
    }
    await db.delete(users).where(eq(users.id, id));
    return reply.send({ ok: true });
  });
}
