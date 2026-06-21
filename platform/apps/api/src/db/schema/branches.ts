import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { appSchema } from "./_pgSchema";
import { products } from "./products";
import { tenants } from "./tenants";

export type BranchSchedule = {
  weekday: number; // 0=domingo
  open: string;   // "08:00"
  close: string;  // "22:00"
}[];

export const branches = appSchema.table(
  "branches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    code: varchar("code", { length: 40 }).notNull(),
    /** Código de sucursal en el ERP (STK_SUCURSAL) para stock en vivo. */
    erpCode: varchar("erp_code", { length: 20 }),
    name: varchar("name", { length: 200 }).notNull(),
    address: text("address"),
    city: varchar("city", { length: 120 }),
    phone: varchar("phone", { length: 40 }),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    schedule: jsonb("schedule").$type<BranchSchedule>(),
    pickupEnabled: boolean("pickup_enabled").notNull().default(true),
    deliveryEnabled: boolean("delivery_enabled").notNull().default(false),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    codeUk: unique("branches_code_uk").on(t.tenantId, t.code),
    tenantIdx: index("branches_tenant_idx").on(t.tenantId),
  }),
);

/**
 * Inventario por (producto, sucursal). Fuente de verdad del stock.
 * `products.stockCached` se calcula sumando esta tabla.
 */
export const inventory = appSchema.table(
  "inventory",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    stock: integer("stock").notNull().default(0),
    reserved: integer("reserved").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.productId, t.branchId] }),
    branchIdx: index("inventory_branch_idx").on(t.branchId),
  }),
);
