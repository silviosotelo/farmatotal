import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export type TenantConfig = {
  branches?: boolean;
  inventory?: boolean;
  variants?: boolean;
  units?: boolean;
  currency?: string;
  productTypes?: string[];
  orderPrefix?: string;
  [k: string]: unknown;
};

export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    domain: varchar("domain", { length: 250 }).unique(),
    status: varchar("status", {
      length: 16,
      enum: ["active", "inactive", "suspended"] as const,
    })
      .notNull()
      .default("active"),
    theme: varchar("theme", { length: 120 }),
    config: jsonb("config").$type<TenantConfig>().notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    slugIdx: index("tenants_slug_idx").on(t.slug),
    domainIdx: index("tenants_domain_idx").on(t.domain),
  }),
);

export const currencies = pgTable("currencies", {
  code: varchar("code", { length: 3 }).primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  symbol: varchar("symbol", { length: 8 }),
  decimalPlaces: integer("decimal_places").notNull().default(2),
  position: varchar("position", {
    length: 16,
    enum: ["before", "after", "before_space", "after_space"] as const,
  }).notNull(),
  thousandsSep: varchar("thousands_sep", { length: 3 }),
  decimalSep: varchar("decimal_sep", { length: 3 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const countries = pgTable(
  "countries",
  {
    code: varchar("code", { length: 2 }).primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    nameEs: varchar("name_es", { length: 120 }),
    currencyCode: varchar("currency_code", { length: 3 }).references(() => currencies.code),
    phonePrefix: varchar("phone_prefix", { length: 8 }),
    taxEnabled: boolean("tax_enabled").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    currencyIdx: index("countries_currency_idx").on(t.currencyCode),
  }),
);
