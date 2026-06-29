import { uuid, varchar, integer, timestamp, decimal, boolean, jsonb } from "drizzle-orm/pg-core";
import { appSchema } from "./_pgSchema";
import { tenants } from "./globals";
import { customers } from "./customers";
import { products } from "./catalog";
import { productVariants } from "./variants";
import { coupons } from "./coupons";

export const carts = appSchema.table("carts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  customerId: uuid("customer_id").references(() => customers.id),
  sessionId: varchar("session_id", { length: 128 }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  currency: varchar("currency", { length: 3 }).notNull().default("PYG"),
  pricesIncludeTax: boolean("prices_include_tax").notNull().default(false),
  version: integer("version").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cartItems = appSchema.table("cart_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  cartId: uuid("cart_id").notNull().references(() => carts.id),
  lineKey: varchar("line_key", { length: 64 }).notNull(),
  productId: uuid("product_id").notNull().references(() => products.id),
  variantId: uuid("variant_id").references(() => productVariants.id),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 26, scale: 8 }),
  subtotal: decimal("subtotal", { precision: 26, scale: 8 }),
  taxTotal: decimal("tax_total", { precision: 26, scale: 8 }),
  total: decimal("total", { precision: 26, scale: 8 }),
  options: jsonb("options").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cartCoupons = appSchema.table("cart_coupons", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  cartId: uuid("cart_id").notNull().references(() => carts.id),
  couponId: uuid("coupon_id").notNull().references(() => coupons.id),
  code: varchar("code", { length: 100 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
