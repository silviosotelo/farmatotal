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
import { users } from "./users";
import { media } from "./media";

export const postTypes = ["page", "slide", "blog_post", "cms_block"] as const;
export type PostType = (typeof postTypes)[number];

export const postStatus = ["draft", "publish", "private", "trash"] as const;
export type PostStatus = (typeof postStatus)[number];

/** Posts: contenido unificado estilo WordPress (post_type). Cubre páginas,
 * slides, blog posts y bloques CMS. Soporta jerarquía (parent_id) y soft-delete. */
export const posts = appSchema.table(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    postType: varchar("post_type", { length: 50, enum: postTypes }).notNull(),
    title: text("title").notNull(),
    content: text("content"),
    excerpt: text("excerpt"),
    slug: varchar("slug", { length: 255 }).notNull(),
    status: varchar("status", { length: 20, enum: postStatus })
      .notNull()
      .default("draft"),
    featuredImageId: uuid("featured_image_id").references(() => media.id, {
      onDelete: "set null",
    }),
    menuOrder: integer("menu_order").notNull().default(0),
    parentId: uuid("parent_id").references((): any => posts.id, { onDelete: "set null" }),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    slugUk: unique("posts_slug_uk").on(t.tenantId, t.postType, t.slug),
    tenantIdx: index("posts_tenant_idx").on(t.tenantId),
    typeIdx: index("posts_type_idx").on(t.postType),
    statusIdx: index("posts_status_idx").on(t.status),
    parentIdx: index("posts_parent_idx").on(t.parentId),
    authorIdx: index("posts_author_idx").on(t.authorId),
    publishedIdx: index("posts_published_idx").on(t.publishedAt),
  }),
);

/** Metadatos clave-valor de posts (patrón WP postmeta). */
export const postMeta = appSchema.table(
  "post_meta",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    metaKey: varchar("meta_key", { length: 255 }).notNull(),
    metaValue: jsonb("meta_value"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    postIdx: index("post_meta_post_idx").on(t.postId),
    metaKeyIdx: index("post_meta_key_idx").on(t.metaKey),
  }),
);
