import { z } from "zod";

export const roleEnum = z.enum(["admin", "editor", "viewer", "customer"]);
export type Role = z.infer<typeof roleEnum>;

export const loginInput = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});
export type LoginInput = z.infer<typeof loginInput>;

export const refreshInput = z.object({});
export type RefreshInput = z.infer<typeof refreshInput>;

export const registerInput = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(120).optional(),
});
export type RegisterInput = z.infer<typeof registerInput>;

export const userPublic = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: roleEnum,
});
export type UserPublic = z.infer<typeof userPublic>;

export const sessionUser = z.object({
  accessToken: z.string(),
  user: userPublic,
});
export type SessionUser = z.infer<typeof sessionUser>;
