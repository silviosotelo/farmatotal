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
import { users } from "./identity";
import { orders, orderItems } from "./orders";
import { paymentAttempts } from "./payments";

export const refundStatus = [
  "pending",
  "approved",
  "rejected",
  "failed",
  "completed",
] as const;
export type RefundStatus = (typeof refundStatus)[number];

export const refunds = appSchema.table(
  "refunds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    paymentAttemptId: uuid("payment_attempt_id").references(() => paymentAttempts.id, {
      onDelete: "set null",
    }),
    status: varchar("status", { length: 20, enum: refundStatus })
      .notNull()
      .default("pending"),
    amount: decimal("amount", { precision: 26, scale: 8 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("PYG"),
    reason: text("reason"),
    gatewayRefundId: varchar("gateway_refund_id", { length: 255 }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("refunds_tenant_idx").on(t.tenantId),
    orderIdx: index("refunds_order_idx").on(t.orderId),
    statusIdx: index("refunds_status_idx").on(t.status),
    paymentAttemptIdx: index("refunds_payment_attempt_idx").on(t.paymentAttemptId),
  }),
);

export const refundItems = appSchema.table(
  "refund_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    refundId: uuid("refund_id")
      .notNull()
      .references(() => refunds.id, { onDelete: "cascade" }),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    subtotal: decimal("subtotal", { precision: 26, scale: 8 }).notNull().default("0"),
    subtotalTax: decimal("subtotal_tax", { precision: 26, scale: 8 })
      .notNull()
      .default("0"),
    total: decimal("total", { precision: 26, scale: 8 }).notNull().default("0"),
    totalTax: decimal("total_tax", { precision: 26, scale: 8 }).notNull().default("0"),
    restock: boolean("restock").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("refund_items_tenant_idx").on(t.tenantId),
    refundIdx: index("refund_items_refund_idx").on(t.refundId),
    orderItemIdx: index("refund_items_order_item_idx").on(t.orderItemId),
  }),
);
