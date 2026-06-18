import { sql } from "drizzle-orm";
import {
  integer,
  jsonb,
  text,
  timestamp,
  uuid,
  varchar,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { farmatotalApp } from "./_pgSchema";
import { branches } from "./branches";
import { products } from "./products";
import { users } from "./users";

export const orderStatus = [
  "pending",
  "paid",
  "processing",
  "fulfilled",
  "delivered",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof orderStatus)[number];

export const shippingMethod = ["pickup", "delivery"] as const;
export const paymentMethod = ["online", "cash", "transfer"] as const;

export type OrderEvent = {
  at: string;
  type: string;
  note?: string;
  by?: string;
  /** Monto en guaraníes (para eventos de reembolso, total o parcial). */
  amount?: number;
};

export const orders = farmatotalApp.table(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: varchar("number", { length: 30 }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),

    // Datos del cliente (snapshot, no FK obligatorio — checkout sin cuenta)
    customerName: varchar("customer_name", { length: 200 }).notNull(),
    customerEmail: varchar("customer_email", { length: 254 }).notNull(),
    customerPhone: varchar("customer_phone", { length: 40 }),
    customerDoc: varchar("customer_doc", { length: 40 }),

    shippingMethod: varchar("shipping_method", { length: 20, enum: shippingMethod }).notNull(),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
    shippingAddress: jsonb("shipping_address").$type<Record<string, unknown>>(),

    paymentMethod: varchar("payment_method", { length: 20, enum: paymentMethod }).notNull(),
    status: varchar("status", { length: 20, enum: orderStatus }).notNull().default("pending"),

    subtotal: integer("subtotal").notNull().default(0),
    discount: integer("discount").notNull().default(0),
    shippingCost: integer("shipping_cost").notNull().default(0),
    total: integer("total").notNull().default(0),

    couponCode: varchar("coupon_code", { length: 60 }),
    events: jsonb("events").$type<OrderEvent[]>().default(sql`'[]'::jsonb`),
    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    numberUk: unique("orders_number_uk").on(t.number),
    statusIdx: index("orders_status_idx").on(t.status),
    userIdx: index("orders_user_idx").on(t.userId),
    emailIdx: index("orders_email_idx").on(t.customerEmail),
  }),
);

export const orderLines = farmatotalApp.table(
  "order_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    sku: varchar("sku", { length: 80 }).notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    unitPrice: integer("unit_price").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotal: integer("line_total").notNull(),
  },
  (t) => ({
    orderIdx: index("order_lines_order_idx").on(t.orderId),
  }),
);
