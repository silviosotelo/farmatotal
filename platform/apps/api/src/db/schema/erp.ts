import { uuid, varchar, timestamp, jsonb, text, integer } from "drizzle-orm/pg-core";
import { appSchema } from "./_pgSchema";
import { tenants } from "./globals";

export const erpApiKeys = appSchema.table("erp_api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name", { length: 200 }).notNull(),
  keyHash: varchar("key_hash", { length: 64 }).notNull().unique(),
  keyPrefix: varchar("key_prefix", { length: 8 }).notNull(),
  permissions: varchar("permissions", { length: 20 }).notNull().default("read"),
  lastAccessAt: timestamp("last_access_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const erpFieldMappings = appSchema.table("erp_field_mappings", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  erpField: varchar("erp_field", { length: 200 }).notNull(),
  platformField: varchar("platform_field", { length: 200 }).notNull(),
  transform: jsonb("transform").notNull().default({}),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const syncRuns = appSchema.table("sync_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  type: varchar("type", { length: 50 }).notNull(),
  direction: varchar("direction", { length: 10 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("running"),
  totalRecords: integer("total_records").notNull().default(0),
  processed: integer("processed").notNull().default(0),
  errorsCount: integer("errors_count").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const syncErrors = appSchema.table("sync_errors", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  syncRunId: uuid("sync_run_id").notNull().references(() => syncRuns.id),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: uuid("entity_id"),
  erpId: varchar("erp_id", { length: 100 }),
  errorCode: varchar("error_code", { length: 100 }),
  errorMessage: text("error_message").notNull(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
