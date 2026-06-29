import { sql } from "drizzle-orm";
import {
  boolean,
  decimal,
  index,
  integer,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { appSchema } from "./_pgSchema";
import { tenants } from "./globals";

export const taxClasses = appSchema.table(
  "tax_classes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    tenantIdx: index("tax_classes_tenant_idx").on(t.tenantId),
    slugIdx: index("tax_classes_slug_idx").on(t.tenantId, t.slug),
  }),
);

export const taxRates = appSchema.table(
  "tax_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    taxClassId: uuid("tax_class_id").references(() => taxClasses.id, { onDelete: "set null" }),
    country: varchar("country", { length: 2 }).notNull().default("*"),
    state: varchar("state", { length: 200 }).notNull().default("*"),
    city: varchar("city", { length: 200 }).notNull().default("*"),
    postcode: varchar("postcode", { length: 200 }).notNull().default("*"),
    rate: decimal("rate", { precision: 10, scale: 4 }).notNull().default("0"),
    name: varchar("name", { length: 200 }).notNull(),
    priority: integer("priority").notNull().default(1),
    compound: boolean("compound").notNull().default(false),
    appliesToShipping: boolean("applies_to_shipping").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    tenantIdx: index("tax_rates_tenant_idx").on(t.tenantId),
    classIdx: index("tax_rates_class_idx").on(t.taxClassId),
  }),
);

export const taxRateLocations = appSchema.table(
  "tax_rate_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    taxRateId: uuid("tax_rate_id")
      .notNull()
      .references(() => taxRates.id, { onDelete: "cascade" }),
    locationCode: varchar("location_code", { length: 200 }).notNull(),
    locationType: varchar("location_type", {
      length: 40,
      enum: ["postcode", "city", "state", "country"] as const,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("tax_rate_locations_tenant_idx").on(t.tenantId),
    rateIdx: index("tax_rate_locations_rate_idx").on(t.taxRateId),
  }),
);
