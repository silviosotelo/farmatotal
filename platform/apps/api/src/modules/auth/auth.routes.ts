import type { FastifyInstance } from "fastify";
import { loginInput, refreshInput, registerInput, sessionUser } from "@platform/shared-types";
import { env } from "../../env.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  findValidRefreshToken,
  persistRefreshToken,
  revokeRefreshToken,
  touchLastLogin,
  verifyPassword,
} from "./auth.service.js";

const REFRESH_COOKIE = "ft_rt";

function refreshTtlMs(spec: string) {
  // Soporta "Nd" "Nh" "Nm" "Ns"
  const m = /^(\d+)([dhms])$/.exec(spec);
  if (!m) return 30 * 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  const unit = m[2];
  const factor = unit === "d" ? 86400000 : unit === "h" ? 3600000 : unit === "m" ? 60000 : 1000;
  return n * factor;
}

export async function authRoutes(app: FastifyInstance) {
  app.post(
    "/auth/login",
    { schema: { body: loginInput, response: { 200: sessionUser } } },
    async (req, reply) => {
      const { email, password } = req.body;
      const user = await findUserByEmail(email.toLowerCase().trim());
      if (!user || user.status !== "active") return reply.unauthorized("Credenciales invalidas");
      const ok = await verifyPassword(password, user.passwordHash);
      if (!ok) return reply.unauthorized("Credenciales invalidas");

      const role = "customer";
      const access = await reply.jwtSign(
        { sub: user.id, role },
        { expiresIn: env.JWT_ACCESS_TTL },
      );
      const refresh = await reply.jwtSign(
        { sub: user.id, typ: "refresh" },
        { key: env.JWT_REFRESH_SECRET, expiresIn: env.JWT_REFRESH_TTL },
      );

      await persistRefreshToken({
        userId: user.id,
        token: refresh,
        ttlMs: refreshTtlMs(env.JWT_REFRESH_TTL),
        userAgent: req.headers["user-agent"] ?? undefined,
        ip: req.ip,
      });
      await touchLastLogin(user.id);

      reply
        .setCookie(REFRESH_COOKIE, refresh, {
          httpOnly: true,
          secure: env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/auth",
          domain: env.COOKIE_DOMAIN,
          maxAge: refreshTtlMs(env.JWT_REFRESH_TTL) / 1000,
        })
        .send({
          accessToken: access,
          user: { id: user.id, email: user.email, name: user.displayName ?? user.email, role },
        });
    },
  );

  app.post(
    "/auth/refresh",
    { schema: { body: refreshInput.optional(), response: { 200: sessionUser } } },
    async (req, reply) => {
      const token = req.cookies[REFRESH_COOKIE];
      if (!token) return reply.unauthorized("Sin refresh");
      let payload: { sub: string };
      try {
        payload = app.jwt.verify(token, { key: env.JWT_REFRESH_SECRET }) as { sub: string };
      } catch {
        return reply.unauthorized("Refresh invalido");
      }
      const stored = await findValidRefreshToken(payload.sub, token);
      if (!stored) return reply.unauthorized("Refresh expirado o revocado");
      const user = await findUserById(payload.sub);
      if (!user || user.status !== "active") return reply.unauthorized("Usuario inactivo");

      const role = "customer";
      const access = await reply.jwtSign(
        { sub: user.id, role },
        { expiresIn: env.JWT_ACCESS_TTL },
      );
      return reply.send({
        accessToken: access,
        user: { id: user.id, email: user.email, name: user.displayName ?? user.email, role },
      });
    },
  );

  app.post("/auth/logout", async (req, reply) => {
    const token = req.cookies[REFRESH_COOKIE];
    if (token) {
      try {
        const payload = app.jwt.verify(token, { key: env.JWT_REFRESH_SECRET }) as { sub: string };
        const stored = await findValidRefreshToken(payload.sub, token);
        if (stored) await revokeRefreshToken(stored.id);
      } catch {
        // ignorar token corrupto, igual borramos cookie
      }
    }
    reply.clearCookie(REFRESH_COOKIE, { path: "/auth", domain: env.COOKIE_DOMAIN }).send({ ok: true });
  });

  // Bootstrap solo cuando no hay usuarios — para el primer admin desde el front.
  app.post(
    "/auth/bootstrap",
    { schema: { body: registerInput, response: { 200: sessionUser } } },
    async (req, reply) => {
      const { db } = await import("../../db/client.js");
      const { users } = await import("../../db/schema/index.js");
      const existing = await db.select({ id: users.id }).from(users).limit(1);
      if (existing.length > 0) return reply.conflict("Ya existen usuarios — usa /auth/login");

      const role = "admin";
      const u = await createUser({ ...req.body, role });
      const access = await reply.jwtSign(
        { sub: u.id, role },
        { expiresIn: env.JWT_ACCESS_TTL },
      );
      return reply.send({
        accessToken: access,
        user: { id: u.id, email: u.email, name: u.displayName ?? u.email, role },
      });
    },
  );

  // Registro público de CLIENTES (rol customer). Crea credenciales reales y deja
  // sesión iniciada (igual que login): accessToken + cookie de refresh.
  app.post(
    "/auth/register",
    { schema: { body: registerInput, response: { 200: sessionUser } } },
    async (req, reply) => {
      const email = req.body.email.toLowerCase().trim();
      const existing = await findUserByEmail(email);
      if (existing) return reply.conflict("Ya existe una cuenta con ese email");

      const role = "customer";
      const u = await createUser({ ...req.body, email, role });
      const access = await reply.jwtSign({ sub: u.id, role }, { expiresIn: env.JWT_ACCESS_TTL });
      const refresh = await reply.jwtSign(
        { sub: u.id, typ: "refresh" },
        { key: env.JWT_REFRESH_SECRET, expiresIn: env.JWT_REFRESH_TTL },
      );
      await persistRefreshToken({
        userId: u.id,
        token: refresh,
        ttlMs: refreshTtlMs(env.JWT_REFRESH_TTL),
        userAgent: req.headers["user-agent"] ?? undefined,
        ip: req.ip,
      });
      reply
        .setCookie(REFRESH_COOKIE, refresh, {
          httpOnly: true,
          secure: env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/auth",
          domain: env.COOKIE_DOMAIN,
          maxAge: refreshTtlMs(env.JWT_REFRESH_TTL) / 1000,
        })
        .send({
          accessToken: access,
          user: { id: u.id, email: u.email, name: u.displayName ?? u.email, role },
        });
    },
  );

  // Usuario actual (a partir del access JWT). Para restaurar sesión y guards en el admin.
  app.get(
    "/auth/me",
    {
      onRequest: async (req, reply) => {
        try {
          await req.jwtVerify();
        } catch {
          return reply.unauthorized("Token inválido o ausente");
        }
      },
      schema: { response: { 200: sessionUser } },
    },
    async (req, reply) => {
      const sub = (req.user as { sub?: string })?.sub;
      const user = sub ? await findUserById(sub) : null;
      if (!user || user.status !== "active") return reply.unauthorized("Usuario no encontrado");
      const role = "customer";
      return reply.send({
        accessToken: "",
        user: { id: user.id, email: user.email, name: user.displayName ?? user.email, role },
      });
    },
  );
}
