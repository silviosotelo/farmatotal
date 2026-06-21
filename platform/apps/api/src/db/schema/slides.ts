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
} from "drizzle-orm/pg-core";
import { appSchema } from "./_pgSchema";

/**
 * Banners del home — replican la lógica del WP de Farmatotal:
 * cada slide se programa por día de la semana (days) y tiene imagen para
 * desktop y/o mobile. El endpoint /slides/today filtra por el día actual.
 */
export const slides = appSchema.table(
  "slides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 200 }).notNull(),
    imageDesktop: text("image_desktop"),
    imageMobile: text("image_mobile"),
    linkHref: text("link_href"),
    /** Días en que se muestra: 0=domingo ... 6=sábado. [] = todos. */
    days: jsonb("days").$type<number[]>().notNull().default(sql`'[]'::jsonb`),
    position: integer("position").notNull().default(0),
    active: boolean("active").notNull().default(true),
    /** Ventana de campaña opcional. */
    dateFrom: timestamp("date_from", { withTimezone: true }),
    dateTo: timestamp("date_to", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    activeIdx: index("slides_active_idx").on(t.active),
    posIdx: index("slides_position_idx").on(t.position),
  }),
);
