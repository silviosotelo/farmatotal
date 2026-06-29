import {
  bigint,
  integer,
  text,
  timestamp,
  uuid,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { appSchema } from "./_pgSchema";
import { tenants } from "./globals";
import { users } from "./identity";

/** Biblioteca de medios: imágenes/archivos usables en logo, banners, slides,
 * productos, posts y CMS. Soporta múltiples storage drivers (local, s3, etc.)
 * y soft-delete (deleted_at). */
export const media = appSchema.table(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    filename: varchar("filename", { length: 300 }).notNull(),
    originalName: varchar("original_name", { length: 500 }),
    mimeType: varchar("mime_type", { length: 120 }),
    size: bigint("size", { mode: "number" }),
    width: integer("width"),
    height: integer("height"),
    altText: text("alt_text"),
    title: varchar("title", { length: 300 }),
    caption: text("caption"),
    storagePath: text("storage_path"),
    storageDriver: varchar("storage_driver", { length: 30 }).notNull().default("local"),
    url: text("url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    tenantIdx: index("media_tenant_idx").on(t.tenantId),
    createdIdx: index("media_created_idx").on(t.createdAt),
    uploadedByIdx: index("media_uploaded_by_idx").on(t.uploadedBy),
    deletedIdx: index("media_deleted_idx").on(t.deletedAt),
  }),
);
