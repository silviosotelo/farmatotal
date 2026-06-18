import { sql } from "drizzle-orm";
import { boolean, integer, jsonb, text, timestamp, uuid, varchar, index, unique } from "drizzle-orm/pg-core";
import { farmatotalApp } from "./_pgSchema";

export type SeoMeta = { title?: string; description?: string };

export const categories = farmatotalApp.table(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 200 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    parentId: uuid("parent_id"),
    position: integer("position").notNull().default(0),
    fliaCodigo: varchar("flia_codigo", { length: 40 }),
    icon: varchar("icon", { length: 80 }),
    description: text("description"),
    seo: jsonb("seo").$type<SeoMeta>(),
    active: boolean("active").notNull().default(true),
    erpSourced: boolean("erp_sourced").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    slugIdx: unique("categories_slug_uk").on(t.slug),
    fliaIdx: unique("categories_flia_uk").on(t.fliaCodigo),
    parentIdx: index("categories_parent_idx").on(t.parentId),
  }),
);
