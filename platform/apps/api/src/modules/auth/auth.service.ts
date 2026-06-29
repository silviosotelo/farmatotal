import argon2 from "argon2";
import { and, eq, gt, isNull } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "../../db/client.js";
import { refreshTokens, users } from "../../db/schema/index.js";

export async function findUserByEmail(email: string) {
  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return u ?? null;
}

export async function findUserById(id: string) {
  const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return u ?? null;
}

export async function verifyPassword(plain: string, hash: string) {
  return argon2.verify(hash, plain);
}

export async function hashPassword(plain: string) {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export async function createUser(input: {
  email: string;
  password: string;
  name?: string;
  role?: string;
}) {
  const passwordHash = await hashPassword(input.password);
  const [u] = await db
    .insert(users)
    .values({
      email: input.email.toLowerCase().trim(),
      passwordHash,
      displayName: input.name ?? null,
    })
    .returning();
  return u!;
}

export function hashRefreshToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function persistRefreshToken(args: {
  userId: string;
  token: string;
  ttlMs: number;
}) {
  await db.insert(refreshTokens).values({
    userId: args.userId,
    tokenHash: hashRefreshToken(args.token),
    expiresAt: new Date(Date.now() + args.ttlMs),
  });
}

export async function findValidRefreshToken(userId: string, token: string) {
  const hash = hashRefreshToken(token);
  const [row] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.userId, userId),
        eq(refreshTokens.tokenHash, hash),
        gt(refreshTokens.expiresAt, new Date()),
        isNull(refreshTokens.revokedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function revokeRefreshToken(id: string) {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, id));
}

export async function touchLastLogin(userId: string) {
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
}
