import {
  boolean,
  index,
  smallint,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { appSchema } from "./_pgSchema";
import { tenants } from "./globals";
import { customers } from "./customers";
import { products } from "./catalog";

export const productReviewStatus = [
  "pending",
  "approved",
  "spam",
  "trash",
] as const;
export type ProductReviewStatus = (typeof productReviewStatus)[number];

export const productReviews = appSchema.table(
  "product_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    rating: smallint("rating").notNull().default(0),
    title: varchar("title", { length: 255 }),
    content: text("content").notNull(),
    status: varchar("status", { length: 20, enum: productReviewStatus })
      .notNull()
      .default("pending"),
    verified: boolean("verified").notNull().default(false),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("product_reviews_tenant_idx").on(t.tenantId),
    productIdx: index("product_reviews_product_idx").on(t.productId),
    customerIdx: index("product_reviews_customer_idx").on(t.customerId),
    statusIdx: index("product_reviews_status_idx").on(t.status),
  }),
);
