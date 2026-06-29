import { uuid, varchar, integer, timestamp, jsonb, text } from "drizzle-orm/pg-core";
import { appSchema } from "./_pgSchema";
import { tenants } from "./globals";

export const outboxEvents = appSchema.table("outbox_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  aggregateType: varchar("aggregate_type", { length: 100 }).notNull(),
  aggregateId: uuid("aggregate_id").notNull(),
  eventType: varchar("event_type", { length: 200 }).notNull(),
  payload: jsonb("payload").notNull().default({}),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(5),
  availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const idempotencyKeys = appSchema.table("idempotency_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  key: varchar("key", { length: 128 }).notNull(),
  scope: varchar("scope", { length: 100 }).notNull(),
  requestHash: varchar("request_hash", { length: 64 }).notNull(),
  responseStatus: integer("response_status"),
  responseBody: jsonb("response_body"),
  resourceId: uuid("resource_id"),
  resourceType: varchar("resource_type", { length: 50 }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
