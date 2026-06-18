import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),
  COOKIE_DOMAIN: z.string().default("localhost"),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173,http://localhost:3000")
    .transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean)),
  // Bancard vPOS (pasarela). Claves vacías = deshabilitado.
  BANCARD_ENV: z.enum(["staging", "production"]).default("staging"),
  BANCARD_PUBLIC_KEY: z.string().default(""),
  BANCARD_PRIVATE_KEY: z.string().default(""),
  PUBLIC_BASE_URL: z.string().default("http://localhost:3000"),
  // URL pública del propio motor (para construir URLs de /media/file/*).
  PUBLIC_API_URL: z.string().default("http://localhost:4000"),
  // ERP push (save_order). GATED: deshabilitado por defecto. El ERP legado es inseguro
  // (sin auth, sslverify=false): acá exigimos token propio y validación de cert.
  ERP_PUSH_ENABLED: z
    .string()
    .default("false")
    .transform((s) => s === "true" || s === "1"),
  ERP_SAVE_ORDER_URL: z.string().default(""),
  ERP_AUTH_TOKEN: z.string().default(""),
  ERP_REJECT_UNAUTHORIZED: z
    .string()
    .default("true")
    .transform((s) => s !== "false" && s !== "0"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("[env] invalid:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
