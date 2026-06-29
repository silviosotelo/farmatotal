import { sql } from "drizzle-orm";
import {
  decimal,
  index,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { appSchema } from "./_pgSchema";
import { tenants } from "./globals";
import { users } from "./identity";
import { branches } from "./branches";
import { products } from "./products";
import { productVariants } from "./variants";

export const inventory = appSchema.table(
  "inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "cascade" }),
    onHand: decimal("on_hand", { precision: 26, scale: 4 }).notNull().default("0"),
    reserved: decimal("reserved", { precision: 26, scale: 4 }).notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    tenantIdx: index("inventory_tenant_idx").on(t.tenantId),
    branchIdx: index("inventory_branch_idx").on(t.branchId),
    productIdx: index("inventory_product_idx").on(t.productId),
    variantIdx: index("inventory_variant_idx").on(t.variantId),
  }),
);

export const inventoryMovements = appSchema.table(
  "inventory_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    inventoryId: uuid("inventory_id")
      .notNull()
      .references(() => inventory.id, { onDelete: "cascade" }),
    type: varchar("type", {
      length: 30,
      enum: [
        "adjustment",
        "purchase",
        "sale",
        "return",
        "transfer_in",
        "transfer_out",
        "reservation",
        "consumption",
        "release",
        "restock",
        "correction",
      ] as const,
    }).notNull(),
    quantity: decimal("quantity", { precision: 26, scale: 4 }).notNull(),
    onHandBefore: decimal("on_hand_before", { precision: 26, scale: 4 }).notNull(),
    onHandAfter: decimal("on_hand_after", { precision: 26, scale: 4 }).notNull(),
    referenceType: varchar("reference_type", { length: 50 }),
    referenceId: uuid("reference_id"),
    reason: text("reason"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("inventory_movements_tenant_idx").on(t.tenantId),
    inventoryIdx: index("inventory_movements_inventory_idx").on(t.inventoryId),
  }),
);

export const inventoryReservations = appSchema.table(
  "inventory_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    orderId: uuid("order_id").notNull(),
    status: varchar("status", {
      length: 20,
      enum: ["active", "consumed", "released", "expired"] as const,
    })
      .notNull()
      .default("active"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    tenantIdx: index("inventory_reservations_tenant_idx").on(t.tenantId),
    orderIdx: index("inventory_reservations_order_idx").on(t.orderId),
    statusIdx: index("inventory_reservations_status_idx").on(t.status),
  }),
);

export const inventoryReservationLines = appSchema.table(
  "inventory_reservation_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    reservationId: uuid("reservation_id")
      .notNull()
      .references(() => inventoryReservations.id, { onDelete: "cascade" }),
    inventoryId: uuid("inventory_id")
      .notNull()
      .references(() => inventory.id, { onDelete: "cascade" }),
    quantity: decimal("quantity", { precision: 26, scale: 4 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("inventory_reservation_lines_tenant_idx").on(t.tenantId),
    reservationIdx: index("inventory_reservation_lines_reservation_idx").on(t.reservationId),
    inventoryIdx: index("inventory_reservation_lines_inventory_idx").on(t.inventoryId),
  }),
);
