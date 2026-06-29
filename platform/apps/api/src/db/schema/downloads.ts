import { uuid, varchar, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { appSchema } from "./_pgSchema";
import { tenants } from "./globals";
import { products } from "./catalog";
import { orders } from "./orders";
import { customers } from "./customers";
import { users } from "./identity";

export const productDownloadDirectories = appSchema.table("product_download_directories", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  url: varchar("url", { length: 1000 }).notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const downloadableProductPermissions = appSchema.table("downloadable_product_permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  downloadId: varchar("download_id", { length: 36 }).notNull(),
  productId: uuid("product_id").notNull().references(() => products.id),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  orderKey: varchar("order_key", { length: 200 }).notNull(),
  userEmail: varchar("user_email", { length: 320 }).notNull(),
  customerId: uuid("customer_id").references(() => customers.id),
  downloadsRemaining: varchar("downloads_remaining", { length: 9 }),
  accessGrantedAt: timestamp("access_granted_at", { withTimezone: true }).notNull().defaultNow(),
  accessExpiresAt: timestamp("access_expires_at", { withTimezone: true }),
  downloadCount: integer("download_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const downloadLog = appSchema.table("download_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  permissionId: uuid("permission_id").notNull().references(() => downloadableProductPermissions.id),
  userId: uuid("user_id").references(() => users.id),
  ipAddress: varchar("ip_address", { length: 100 }),
  userAgent: text("user_agent"),
  downloadedAt: timestamp("downloaded_at", { withTimezone: true }).notNull().defaultNow(),
});
