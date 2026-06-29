import { uuid, varchar, text, timestamp, jsonb, integer, smallint } from "drizzle-orm/pg-core";
import { appSchema } from "./_pgSchema";
import { tenants } from "./globals";
import { users } from "./identity";
import { outboxEvents } from "./outbox";

export const webhookSubscriptions = appSchema.table("webhook_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull().default(""),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  deliveryUrl: text("delivery_url").notNull(),
  secret: text("secret").notNull(),
  topic: varchar("topic", { length: 200 }).notNull(),
  apiVersion: smallint("api_version").notNull().default(1),
  failureCount: smallint("failure_count").notNull().default(0),
  maxFailureCount: smallint("max_failure_count").notNull().default(5),
  userId: uuid("user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const webhookDeliveries = appSchema.table("webhook_deliveries", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  subscriptionId: uuid("subscription_id").notNull().references(() => webhookSubscriptions.id),
  eventId: uuid("event_id").references(() => outboxEvents.id),
  attempt: integer("attempt").notNull().default(1),
  requestBody: jsonb("request_body").notNull(),
  requestHeaders: jsonb("request_headers").notNull().default({}),
  responseStatus: smallint("response_status"),
  responseBody: text("response_body"),
  durationMs: integer("duration_ms"),
  error: text("error"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const webhookReceipts = appSchema.table("webhook_receipts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  provider: varchar("provider", { length: 100 }).notNull(),
  externalEventId: varchar("external_event_id", { length: 255 }).notNull(),
  payloadHash: varchar("payload_hash", { length: 64 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("received"),
  error: text("error"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
