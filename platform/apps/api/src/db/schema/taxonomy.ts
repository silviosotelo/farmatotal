import {
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
import { tenants } from "./tenants";

export const termObjectTypes = ["post", "product", "variant"] as const;
export type TermObjectType = (typeof termObjectTypes)[number];

/** Términos de taxonomía (patrón WP terms). Un término es una etiqueta
 * atómica (name + slug); su significado lo da la taxonomía en termTaxonomy. */
export const terms = appSchema.table(
  "terms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugUk: unique("terms_slug_uk").on(t.tenantId, t.slug),
    tenantIdx: index("terms_tenant_idx").on(t.tenantId),
  }),
);

/** Taxonomías de términos (patrón WP term_taxonomy). Una taxonomía agrupa
 * términos (ej. category, tag, brand_line, producto_line). Un término puede
 * pertenecer a múltiples taxonomías. Soporta jerarquía (parent_id). */
export const termTaxonomy = appSchema.table(
  "term_taxonomy",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    termId: uuid("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
    taxonomy: varchar("taxonomy", { length: 50 }).notNull(),
    description: text("description"),
    parentId: uuid("parent_id").references((): any => termTaxonomy.id, {
      onDelete: "set null",
    }),
    count: integer("count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    termTaxUk: unique("term_taxonomy_term_tax_uk").on(t.tenantId, t.termId, t.taxonomy),
    termIdx: index("term_taxonomy_term_idx").on(t.termId),
    taxonomyIdx: index("term_taxonomy_taxonomy_idx").on(t.taxonomy),
    parentIdx: index("term_taxonomy_parent_idx").on(t.parentId),
  }),
);

/** Relación entre objetos (posts/productos/variantes) y términos de taxonomía
 * (patrón WP term_relationships). object_id no es FK: apunta a la PK de la
 * tabla correspondiente según object_type. */
export const termRelationships = appSchema.table(
  "term_relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    objectId: uuid("object_id").notNull(),
    objectType: varchar("object_type", { length: 50, enum: termObjectTypes }).notNull(),
    termTaxonomyId: uuid("term_taxonomy_id")
      .notNull()
      .references(() => termTaxonomy.id, { onDelete: "cascade" }),
    termOrder: integer("term_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    objectIdx: index("term_relationships_object_idx").on(t.objectId, t.objectType),
    termTaxonomyIdx: index("term_relationships_term_taxonomy_idx").on(t.termTaxonomyId),
  }),
);

/** Metadatos clave-valor de términos (patrón WP termmeta). */
export const termMeta = appSchema.table(
  "term_meta",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    termId: uuid("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
    metaKey: varchar("meta_key", { length: 255 }).notNull(),
    metaValue: jsonb("meta_value"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    termIdx: index("term_meta_term_idx").on(t.termId),
    metaKeyIdx: index("term_meta_key_idx").on(t.metaKey),
  }),
);
