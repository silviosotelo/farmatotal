import { sql } from "drizzle-orm";
import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  uuid,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { appSchema } from "./_pgSchema";
import { tenants } from "./globals";

export const branches = appSchema.table(
  "branches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: varchar("name", { length: 255 }).notNull(),
    code: varchar("code", { length: 50 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    address: text("address"),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 100 }),
    postcode: varchar("postcode", { length: 20 }),
    country: varchar("country", { length: 2 }).notNull().default("PY"),
    phone: varchar("phone", { length: 50 }),
    email: varchar("email", { length: 320 }),
    latitude: decimal("latitude", { precision: 10, scale: 8 }),
    longitude: decimal("longitude", { precision: 11, scale: 8 }),
    isPickup: boolean("is_pickup").notNull().default(false),
    isPrimary: boolean("is_primary").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    status: varchar("status", {
      length: 20,
      enum: ["active", "inactive"] as const,
    })
      .notNull()
      .default("active"),
    erpId: varchar("erp_id", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    tenantIdx: index("branches_tenant_idx").on(t.tenantId),
    codeUk: unique("branches_code_uk").on(t.tenantId, t.code),
    slugUk: unique("branches_slug_uk").on(t.tenantId, t.slug),
  }),
);

export const branchMeta = appSchema.table(
  "branch_meta",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    metaKey: varchar("meta_key", { length: 255 }).notNull(),
    metaValue: jsonb("meta_value"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("branch_meta_tenant_idx").on(t.tenantId),
    branchIdx: index("branch_meta_branch_idx").on(t.branchId),
  }),
);
