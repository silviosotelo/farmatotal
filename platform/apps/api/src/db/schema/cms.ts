import { sql } from "drizzle-orm";
import { boolean, jsonb, timestamp, uuid, varchar, unique, primaryKey } from "drizzle-orm/pg-core";
import { appSchema, type SeoMeta } from "./_pgSchema";
import { tenants } from "./tenants";

export type PageBlock = {
  type: "hero" | "richText" | "productGrid" | "banner" | "categoryGrid";
  [key: string]: unknown;
};

export const pages = appSchema.table(
  "pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    slug: varchar("slug", { length: 250 }).notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    blocks: jsonb("blocks").$type<PageBlock[]>().default(sql`'[]'::jsonb`),
    seo: jsonb("seo").$type<SeoMeta>(),
    published: boolean("published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    slugUk: unique("pages_slug_uk").on(t.tenantId, t.slug),
  }),
);

/** Settings clave-valor por modulo (banners home, config tienda, etc). */
export const settings = appSchema.table(
  "settings",
  {
    key: varchar("key", { length: 120 }).notNull(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    value: jsonb("value"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.tenantId, t.key] }),
  }),
);
