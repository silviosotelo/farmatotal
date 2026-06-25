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
    /** Valores de campos personalizados (config en settings mod_branch_fields). */
    custom: jsonb("custom").$type<Record<string, unknown>>(),
    /** Trazabilidad de import (ERP/Woo): sistema y id de origen. */
    sourceId: varchar("source_id", { length: 80 }),
    sourceSystem: varchar("source_system", { length: 40 }),
    /** Costo extra de envío para esta sucursal. */
    deliveryCost: doublePrecision("delivery_cost").notNull().default(0),
    /** Radio máximo de envío en km (0 = sin límite). */
    deliveryRadius: doublePrecision("delivery_radius").notNull().default(0),
    /** Métodos de pago deshabilitados (separados por coma). */
    paymentGatewaysDisabled: varchar("payment_gateways_disabled", { length: 500 }),
    /** Métodos de envío deshabilitados (separados por coma). */
    shippingMethodsDisabled: varchar("shipping_methods_disabled", { length: 500 }),
    /** Países permitidos para flujo de envío "por país" (códigos separados por coma). */
    countriesAllowed: varchar("countries_allowed", { length: 500 }),
    /** Esta sucursal es el almacén de envío en click & collect. */
    isDeliveryInventory: boolean("is_delivery_inventory").notNull().default(false),
    /** Stock aumenta al confirmar pedido (almacén de compras). */
    isPurchasingWarehouse: boolean("is_purchasing_warehouse").notNull().default(false),
    /** Orden personalizado de visualización. */
    sortOrder: integer("sort_order").notNull().default(0),
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

/**
 * Historial de movimientos de stock por producto y sucursal.
 */
export const stockMovements = appSchema.table(
  "stock_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: varchar("tenant_id", { length: 128 }).notNull(),
    productId: varchar("product_id", { length: 64 }).notNull(),
    branchId: varchar("branch_id", { length: 64 }).notNull(),
    /** +5 agregar, -3 reducir */
    delta: integer("delta").notNull(),
    /** 'order_reduce', 'order_restore', 'manual_adjust', 'import', 'refund' */
    reason: varchar("reason", { length: 100 }).notNull(),
    /** order_id u otra referencia */
    referenceId: varchar("reference_id", { length: 64 }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    productIdx: index("stock_movements_product_idx").on(t.tenantId, t.productId),
    branchIdx: index("stock_movements_branch_idx").on(t.tenantId, t.branchId),
  }),
);
