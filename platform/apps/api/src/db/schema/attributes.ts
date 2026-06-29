import { uuid, varchar, boolean, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { appSchema } from "./_pgSchema";
import { tenants } from "./globals";
import { media } from "./media";
import { productVariants } from "./variants";

export const productAttributes = appSchema.table("product_attributes", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull(),
  label: varchar("label", { length: 200 }).notNull(),
  type: varchar("type", { length: 20 }).notNull().default("select"),
  orderBy: varchar("order_by", { length: 20 }).notNull().default("menu_order"),
  hasArchives: boolean("has_archives").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productAttributeValues = appSchema.table("product_attribute_values", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  attributeId: uuid("attribute_id").notNull().references(() => productAttributes.id),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull(),
  colorHex: varchar("color_hex", { length: 7 }),
  imageId: uuid("image_id").references(() => media.id),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const variantAttributeValues = appSchema.table("variant_attribute_values", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  variantId: uuid("variant_id").notNull().references(() => productVariants.id),
  attributeValueId: uuid("attribute_value_id").notNull().references(() => productAttributeValues.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
