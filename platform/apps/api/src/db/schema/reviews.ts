import { sql } from "drizzle-orm";
import { integer, text, timestamp, uuid, varchar, index } from "drizzle-orm/pg-core";
import { farmatotalApp } from "./_pgSchema";
import { products } from "./products";

/** Estado de moderación de la valoración (igual a Woo: pending/approved/rejected). */
export const reviewStatus = ["pending", "approved", "rejected"] as const;
export type ReviewStatus = (typeof reviewStatus)[number];

export const reviews = farmatotalApp.table(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    author: varchar("author", { length: 120 }).notNull(),
    email: varchar("email", { length: 200 }),
    rating: integer("rating").notNull().default(5),
    title: varchar("title", { length: 200 }),
    body: text("body").notNull(),
    status: varchar("status", { length: 20, enum: reviewStatus })
      .notNull()
      .default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    productIdx: index("reviews_product_idx").on(t.productId),
    statusIdx: index("reviews_status_idx").on(t.status),
  }),
);
