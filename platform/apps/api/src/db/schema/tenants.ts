import { sql } from "drizzle-orm";
import { boolean, jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { appSchema } from "./_pgSchema";

/** Perfil de rubro / feature-flags por tenant (multi-rubro). */
export type TenantConfig = {
  /** Usa sucursales (pickup/selector). */
  branches?: boolean;
  /** Controla stock/inventario. */
  inventory?: boolean;
  /** Usa variantes de producto. */
  variants?: boolean;
  /** Vende por unidad de medida (kg/lt/m²) con cantidades decimales. */
  units?: boolean;
  /** Moneda ISO 4217 (override de store_config). */
  currency?: string;
  /** Tipos de producto permitidos: physical | digital | service. */
  productTypes?: string[];
  /** Prefijo white-label para el número de orden (ej. "ORD", "FT"). Default "ORD". */
  orderPrefix?: string;
  [k: string]: unknown;
};

/**
 * Tenants (multitenant). Cada tienda white-label es un tenant; se resuelve por
 * dominio (Host) o header `x-tenant` (slug). Las tablas del core llevan
 * `tenant_id` y toda query se scopea por tenant. `config` define el perfil de
 * rubro (qué features usa la tienda).
 */
export const tenants = appSchema.table("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  domain: varchar("domain", { length: 250 }).unique(),
  active: boolean("active").notNull().default(true),
  config: jsonb("config").$type<TenantConfig>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
