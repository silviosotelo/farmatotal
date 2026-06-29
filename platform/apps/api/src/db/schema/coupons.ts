import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  timestamp,
  uuid,
  varchar,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { appSchema } from "./_pgSchema";
import { tenants } from "./globals";

export const couponType = ["percent", "fixed"] as const;
export type CouponType = (typeof couponType)[number];

export const coupons = appSchema.table(
  "coupons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    code: varchar("code", { length: 60 }).notNull(),
    type: varchar("type", { length: 20, enum: couponType }).notNull().default("percent"),
    /** percent: 0-100. fixed: monto en Gs. */
    value: integer("value").notNull(),
    minSubtotal: integer("min_subtotal").notNull().default(0),
    maxUses: integer("max_uses"),
    usedCount: integer("used_count").notNull().default(0),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    codeUk: unique("coupons_code_uk").on(t.tenantId, t.code),
    activeIdx: index("coupons_active_idx").on(t.active),
  }),
);

export const payments = appSchema.table(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull(),
    provider: varchar("provider", { length: 30 }).notNull().default("bancard"),
    status: varchar("status", {
      length: 20,
      enum: ["pending", "approved", "rejected", "rolled_back"] as const,
    })
      .notNull()
      .default("pending"),
    amount: integer("amount").notNull(),
    providerRef: varchar("provider_ref", { length: 120 }),
    rawPayload: varchar("raw_payload", { length: 4000 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    orderIdx: index("payments_order_idx").on(t.orderId),
  }),
);
