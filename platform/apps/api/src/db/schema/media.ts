import { sql } from "drizzle-orm";
import { integer, text, timestamp, uuid, varchar, index } from "drizzle-orm/pg-core";
import { farmatotalApp } from "./_pgSchema";

/** Biblioteca de medios: imágenes/archivos usables en logo, banners, slides, productos. */
export const media = farmatotalApp.table(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    url: text("url").notNull(),
    filename: varchar("filename", { length: 300 }).notNull(),
    mime: varchar("mime", { length: 120 }),
    size: integer("size").notNull().default(0),
    alt: varchar("alt", { length: 300 }),
    /** "external" = URL registrada · "upload" = bytes guardados en disco. */
    kind: varchar("kind", { length: 20 }).notNull().default("upload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    createdIdx: index("media_created_idx").on(t.createdAt),
  }),
);
