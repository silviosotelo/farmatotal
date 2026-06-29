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
import { appSchema } from "./_pgSchema";
import { products } from "./catalog";

/** Atributos genéricos de la variante (white-label: talle/color, mg/cantidad, etc.). */
export type VariantAttributes = Record<string, string>;

export const productVariants = appSchema.table(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: varchar("sku", { length: 80 }).notNull(),
    /** Etiqueta visible de la variante (ej. "500 mg x 30", "Talle M / Rojo"). */
    title: varchar("title", { length: 250 }).notNull(),
    /** Pares clave-valor genéricos, sin naming por rubro. */
    attributes: jsonb("attributes").$type<VariantAttributes>(),

    /** Precios en Gs. 0 = hereda del producto padre. */
    priceNormal: integer("price_normal").notNull().default(0),
    priceWeb: integer("price_web").notNull().default(0),

    stockCached: integer("stock_cached").notNull().default(0),
    imageUrl: text("image_url"),
    position: integer("position").notNull().default(0),
    active: boolean("active").notNull().default(true),

    sourceSystem: varchar("source_system", { length: 30 }),
    sourceId: varchar("source_id", { length: 80 }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    skuUk: unique("product_variants_sku_uk").on(t.sku),
    productIdx: index("product_variants_product_idx").on(t.productId),
  }),
);
