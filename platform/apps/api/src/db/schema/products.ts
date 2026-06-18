import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  text,
  timestamp,
  uuid,
  varchar,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { farmatotalApp, type SeoMeta } from "./_pgSchema";
import { brands } from "./brands";
import { categories } from "./categories";

/** Estado del producto en la tienda. */
export const productStatus = ["draft", "published", "archived"] as const;
export type ProductStatus = (typeof productStatus)[number];

/** Datos arbitrarios por producto (origen ERP / vademecum / Woo meta). */
export type ProductCustom = Record<string, unknown>;

export const products = farmatotalApp.table(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sku: varchar("sku", { length: 80 }).notNull(),
    codInterno: varchar("cod_interno", { length: 80 }),
    slug: varchar("slug", { length: 250 }).notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    /** Descripcion plana (texto). Para rich text usar descriptionRich. */
    description: text("description"),
    descriptionRich: jsonb("description_rich"),
    brandId: uuid("brand_id").references(() => brands.id, { onDelete: "set null" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),

    /** Precios en Gs (entero, sin decimales). */
    priceNormal: integer("price_normal").notNull().default(0),
    priceWeb: integer("price_web").notNull().default(0),

    onPromo: boolean("on_promo").notNull().default(false),
    promoCode: varchar("promo_code", { length: 60 }),
    controlled: boolean("controlled").notNull().default(false),
    featured: boolean("featured").notNull().default(false),

    status: varchar("status", { length: 20, enum: productStatus })
      .notNull()
      .default("published"),

    /** Stock agregado cacheado (suma de inventory por sucursal).
     * Lo recalcula el job de sync o un trigger. NO es fuente de verdad. */
    stockCached: integer("stock_cached").notNull().default(0),

    seo: jsonb("seo").$type<SeoMeta>(),
    custom: jsonb("custom").$type<ProductCustom>(),

    /** Overrides editoriales que no se pisan al re-sync. */
    titleOverride: varchar("title_override", { length: 300 }),
    descriptionOverride: text("description_override"),
    slugOverride: varchar("slug_override", { length: 250 }),

    erpSourced: boolean("erp_sourced").notNull().default(false),
    /** id del lado origen (Woo product_id o ERP id) para idempotencia. */
    sourceSystem: varchar("source_system", { length: 30 }),
    sourceId: varchar("source_id", { length: 80 }),

    syncedAt: timestamp("synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    skuUk: unique("products_sku_uk").on(t.sku),
    codInternoUk: unique("products_cod_interno_uk").on(t.codInterno),
    slugUk: unique("products_slug_uk").on(t.slug),
    sourceUk: unique("products_source_uk").on(t.sourceSystem, t.sourceId),
    categoryIdx: index("products_category_idx").on(t.categoryId),
    brandIdx: index("products_brand_idx").on(t.brandId),
    statusIdx: index("products_status_idx").on(t.status),
    featuredIdx: index("products_featured_idx").on(t.featured),
  }),
);

export const productImages = farmatotalApp.table(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: varchar("alt", { length: 300 }),
    position: integer("position").notNull().default(0),
    /** Marca de imagen primaria (la primera por defecto). */
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    productIdx: index("product_images_product_idx").on(t.productId),
  }),
);
