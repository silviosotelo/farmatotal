import { sql } from "drizzle-orm";
import { boolean, text, timestamp, uuid, varchar, unique } from "drizzle-orm/pg-core";
import { appSchema } from "./_pgSchema";
import { tenants } from "./tenants";

export const brands = appSchema.table(
  "brands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    slug: varchar("slug", { length: 200 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    logoUrl: text("logo_url"),
    description: text("description"),
    active: boolean("active").notNull().default(true),
    erpSourced: boolean("erp_sourced").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    slugIdx: unique("brands_slug_uk").on(t.tenantId, t.slug),
    nameIdx: unique("brands_name_uk").on(t.tenantId, t.name),
  }),
);
