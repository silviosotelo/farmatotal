import { sql } from "drizzle-orm";
import { boolean, integer, jsonb, text, timestamp, uuid, varchar, index, unique } from "drizzle-orm/pg-core";
import { appSchema } from "./_pgSchema";
import { tenants } from "./tenants";

export type SeoMeta = { title?: string; description?: string };

export const categories = appSchema.table(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
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
    /** Valores de campos personalizados (config en settings mod_category_fields). */
    custom: jsonb("custom").$type<Record<string, unknown>>(),
    /** Trazabilidad de import (ERP/Woo): sistema y id de origen. */
    sourceId: varchar("source_id", { length: 80 }),
    sourceSystem: varchar("source_system", { length: 40 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    slugIdx: unique("categories_slug_uk").on(t.tenantId, t.slug),
    fliaIdx: unique("categories_flia_uk").on(t.tenantId, t.fliaCodigo),
    tenantIdx: index("categories_tenant_idx").on(t.tenantId),
    parentIdx: index("categories_parent_idx").on(t.parentId),
  }),
);
