import { pgTable, uuid, varchar, text, integer, decimal, boolean, timestamp, jsonb, smallint, real } from "drizzle-orm/pg-core";
import { appSchema } from "./_pgSchema";
import { tenants } from "./globals";
import { posts } from "./posts";
import { media } from "./media";
import { termTaxonomy } from "./taxonomy";

export const products = appSchema.table("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  postId: uuid("post_id").references(() => posts.id),
  type: varchar("type", { length: 30 }).notNull().default("simple"),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  sku: varchar("sku", { length: 100 }),
  barcode: varchar("barcode", { length: 100 }),
  globalUniqueId: varchar("global_unique_id", { length: 100 }),
  regularPrice: decimal("regular_price", { precision: 26, scale: 8 }),
  salePrice: decimal("sale_price", { precision: 26, scale: 8 }),
  salePriceFrom: timestamp("sale_price_from", { withTimezone: true }),
  salePriceTo: timestamp("sale_price_to", { withTimezone: true }),
  manageStock: boolean("manage_stock").notNull().default(false),
  stockStatus: varchar("stock_status", { length: 20 }).notNull().default("instock"),
  backorders: varchar("backorders", { length: 20 }).notNull().default("no"),
  weight: decimal("weight", { precision: 10, scale: 3 }),
  length: decimal("length", { precision: 10, scale: 3 }),
  width: decimal("width", { precision: 10, scale: 3 }),
  height: decimal("height", { precision: 10, scale: 3 }),
  virtual: boolean("virtual").notNull().default(false),
  downloadable: boolean("downloadable").notNull().default(false),
  soldIndividually: boolean("sold_individually").notNull().default(false),
  minPurchaseQty: integer("min_purchase_qty"),
  maxPurchaseQty: integer("max_purchase_qty"),
  taxStatus: varchar("tax_status", { length: 20 }).notNull().default("taxable"),
  taxClassId: uuid("tax_class_id"),
  shippingClassId: uuid("shipping_class_id").references(() => termTaxonomy.id),
  featured: boolean("featured").notNull().default(false),
  purchaseNote: text("purchase_note"),
  externalUrl: text("external_url"),
  totalSales: integer("total_sales").notNull().default(0),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).notNull().default("0.00"),
  ratingCount: integer("rating_count").notNull().default(0),
  erpId: varchar("erp_id", { length: 100 }),
  erpSyncedAt: timestamp("erp_synced_at", { withTimezone: true }),
  erpSyncVersion: integer("erp_sync_version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const productMeta = appSchema.table("product_meta", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  metaKey: varchar("meta_key", { length: 255 }).notNull(),
  metaValue: jsonb("meta_value").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productImages = appSchema.table("product_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  mediaId: uuid("media_id").notNull().references(() => media.id),
  altText: varchar("alt_text", { length: 255 }).notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productSpecifications = appSchema.table("product_specifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  groupName: varchar("group_name", { length: 100 }).notNull().default("General"),
  label: varchar("label", { length: 255 }).notNull(),
  value: text("value").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
