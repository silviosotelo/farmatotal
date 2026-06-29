import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { appSchema } from "./_pgSchema";
import { tenants } from "./globals";

export const shippingZones = appSchema.table(
  "shipping_zones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: varchar("name", { length: 200 }).notNull(),
    sortOrder: integer("sort_order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    tenantIdx: index("shipping_zones_tenant_idx").on(t.tenantId),
  }),
);

export const shippingZoneLocations = appSchema.table(
  "shipping_zone_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    zoneId: uuid("zone_id")
      .notNull()
      .references(() => shippingZones.id, { onDelete: "cascade" }),
    locationCode: varchar("location_code", { length: 200 }).notNull(),
    locationType: varchar("location_type", {
      length: 40,
      enum: ["postcode", "city", "state", "country", "continent"] as const,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("shipping_zone_locations_tenant_idx").on(t.tenantId),
    zoneIdx: index("shipping_zone_locations_zone_idx").on(t.zoneId),
  }),
);

export const shippingMethods = appSchema.table(
  "shipping_methods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    methodId: varchar("method_id", { length: 100 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
    sortOrder: integer("sort_order").notNull(),
    config: jsonb("config").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    tenantIdx: index("shipping_methods_tenant_idx").on(t.tenantId),
  }),
);

export const shippingZoneMethods = appSchema.table(
  "shipping_zone_methods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    zoneId: uuid("zone_id")
      .notNull()
      .references(() => shippingZones.id, { onDelete: "cascade" }),
    methodId: varchar("method_id", { length: 200 }).notNull(),
    methodName: varchar("method_name", { length: 200 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
    sortOrder: integer("sort_order").notNull(),
    config: jsonb("config").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    tenantIdx: index("shipping_zone_methods_tenant_idx").on(t.tenantId),
    zoneIdx: index("shipping_zone_methods_zone_idx").on(t.zoneId),
  }),
);
