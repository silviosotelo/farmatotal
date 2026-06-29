import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  smallint,
  text,
  timestamp,
  uuid,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { appSchema } from "./_pgSchema";
import { tenants } from "./globals";
import { customers } from "./customers";
import { orders } from "./orders";

export const paymentAttemptStatus = [
  "created",
  "requires_action",
  "processing",
  "authorized",
  "captured",
  "failed",
  "cancelled",
  "refunded",
  "partially_refunded",
] as const;
export type PaymentAttemptStatus = (typeof paymentAttemptStatus)[number];

export const paymentTransactionType = [
  "purchase",
  "authorization",
  "capture",
  "refund",
  "void",
] as const;
export type PaymentTransactionType = (typeof paymentTransactionType)[number];

export const paymentTokenType = ["credit_card"] as const;
export type PaymentTokenType = (typeof paymentTokenType)[number];

export const paymentGateways = appSchema.table(
  "payment_gateways",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    gatewayId: varchar("gateway_id", { length: 100 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    enabled: boolean("enabled").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("payment_gateways_tenant_idx").on(t.tenantId),
    gatewayUk: unique("payment_gateways_tenant_gateway_uk").on(t.tenantId, t.gatewayId),
  }),
);

export const paymentGatewayMeta = appSchema.table(
  "payment_gateway_meta",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    gatewayId: uuid("gateway_id")
      .notNull()
      .references(() => paymentGateways.id, { onDelete: "cascade" }),
    metaKey: varchar("meta_key", { length: 255 }).notNull(),
    metaValue: jsonb("meta_value"),
    isSensitive: boolean("is_sensitive").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("payment_gateway_meta_tenant_idx").on(t.tenantId),
    gatewayIdx: index("payment_gateway_meta_gateway_idx").on(t.gatewayId),
    metaKeyIdx: index("payment_gateway_meta_key_idx").on(t.metaKey),
  }),
);

export const paymentAttempts = appSchema.table(
  "payment_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    gateway: varchar("gateway", { length: 100 }).notNull(),
    status: varchar("status", { length: 30, enum: paymentAttemptStatus })
      .notNull()
      .default("created"),
    transactionType: varchar("transaction_type", {
      length: 20,
      enum: paymentTransactionType,
    })
      .notNull()
      .default("purchase"),
    amount: decimal("amount", { precision: 26, scale: 8 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("PYG"),
    idempotencyKey: varchar("idempotency_key", { length: 128 }),
    externalId: varchar("external_id", { length: 255 }),
    externalStatus: varchar("external_status", { length: 100 }),
    failureCode: varchar("failure_code", { length: 100 }),
    failureMessage: text("failure_message"),
    amountCaptured: decimal("amount_captured", { precision: 26, scale: 8 })
      .notNull()
      .default("0"),
    amountRefunded: decimal("amount_refunded", { precision: 26, scale: 8 })
      .notNull()
      .default("0"),
    paymentTokenId: uuid("payment_token_id").references(() => paymentTokens.id, {
      onDelete: "set null",
    }),
    authorizedAt: timestamp("authorized_at", { withTimezone: true }),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("payment_attempts_tenant_idx").on(t.tenantId),
    orderIdx: index("payment_attempts_order_idx").on(t.orderId),
    statusIdx: index("payment_attempts_status_idx").on(t.status),
    idempotencyIdx: unique("payment_attempts_idempotency_idx").on(t.tenantId, t.idempotencyKey),
    externalIdx: index("payment_attempts_external_idx").on(t.gateway, t.externalId),
  }),
);

export const paymentTokens = appSchema.table(
  "payment_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    gatewayId: varchar("gateway_id", { length: 200 }).notNull(),
    token: text("token").notNull(),
    type: varchar("type", { length: 200, enum: paymentTokenType })
      .notNull()
      .default("credit_card"),
    last4: varchar("last4", { length: 4 }),
    expiryYear: smallint("expiry_year"),
    expiryMonth: smallint("expiry_month"),
    cardType: varchar("card_type", { length: 50 }),
    isDefault: boolean("is_default").notNull().default(false),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("payment_tokens_tenant_idx").on(t.tenantId),
    customerIdx: index("payment_tokens_customer_idx").on(t.customerId),
  }),
);

export const paymentTokenMeta = appSchema.table(
  "payment_token_meta",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    paymentTokenId: uuid("payment_token_id")
      .notNull()
      .references(() => paymentTokens.id, { onDelete: "cascade" }),
    metaKey: varchar("meta_key", { length: 255 }).notNull(),
    metaValue: jsonb("meta_value"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("payment_token_meta_tenant_idx").on(t.tenantId),
    tokenIdx: index("payment_token_meta_token_idx").on(t.paymentTokenId),
    metaKeyIdx: index("payment_token_meta_key_idx").on(t.metaKey),
  }),
);
