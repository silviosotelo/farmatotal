import {
  AnyPgColumn,
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { appSchema } from "./_pgSchema";
import { tenants } from "./globals";
import { users } from "./identity";
import { customers } from "./customers";
import { branches } from "./branches";
import { products } from "./catalog";
import { productVariants } from "./variants";
import { coupons } from "./coupons";

export const orderType = ["shop_order", "shop_order_refund"] as const;
export type OrderType = (typeof orderType)[number];

export const orderStatus = [
  "pending",
  "confirmed",
  "processing",
  "completed",
  "cancelled",
  "closed",
] as const;
export type OrderStatus = (typeof orderStatus)[number];

export const orderPaymentStatus = [
  "unpaid",
  "pending",
  "authorized",
  "paid",
  "partially_refunded",
  "refunded",
  "failed",
] as const;
export type OrderPaymentStatus = (typeof orderPaymentStatus)[number];

export const orderFulfillmentStatus = [
  "unfulfilled",
  "processing",
  "partially_fulfilled",
  "fulfilled",
  "returned",
] as const;
export type OrderFulfillmentStatus = (typeof orderFulfillmentStatus)[number];

export const orderFiscalStatus = [
  "not_required",
  "pending",
  "issued",
  "failed",
  "cancelled",
] as const;
export type OrderFiscalStatus = (typeof orderFiscalStatus)[number];

export const orderItemType = [
  "line_item",
  "shipping",
  "tax",
  "coupon",
  "fee",
] as const;
export type OrderItemType = (typeof orderItemType)[number];

export const orderAddressType = ["billing", "shipping"] as const;
export type OrderAddressType = (typeof orderAddressType)[number];

export const orderTimelineType = [
  "status_change",
  "payment",
  "fulfillment",
  "note",
  "email_sent",
  "webhook_sent",
  "system",
  "fiscal",
] as const;
export type OrderTimelineType = (typeof orderTimelineType)[number];

export const orderTimelineVisibility = ["internal", "customer", "both"] as const;
export type OrderTimelineVisibility = (typeof orderTimelineVisibility)[number];

export const orderTimelineActorType = [
  "user",
  "customer",
  "system",
  "gateway",
  "erp",
] as const;
export type OrderTimelineActorType = (typeof orderTimelineActorType)[number];

export const orders = appSchema.table(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    type: varchar("type", { length: 20, enum: orderType })
      .notNull()
      .default("shop_order"),
    parentOrderId: uuid("parent_order_id").references(
      (): AnyPgColumn => orders.id,
      { onDelete: "set null" },
    ),
    status: varchar("status", { length: 20, enum: orderStatus })
      .notNull()
      .default("pending"),
    paymentStatus: varchar("payment_status", { length: 30, enum: orderPaymentStatus })
      .notNull()
      .default("unpaid"),
    fulfillmentStatus: varchar("fulfillment_status", {
      length: 30,
      enum: orderFulfillmentStatus,
    })
      .notNull()
      .default("unfulfilled"),
    fiscalStatus: varchar("fiscal_status", { length: 20, enum: orderFiscalStatus })
      .notNull()
      .default("not_required"),
    currency: varchar("currency", { length: 3 }).notNull().default("PYG"),
    subtotal: decimal("subtotal", { precision: 26, scale: 8 }).notNull().default("0"),
    discountTotal: decimal("discount_total", { precision: 26, scale: 8 })
      .notNull()
      .default("0"),
    discountTaxTotal: decimal("discount_tax_total", { precision: 26, scale: 8 })
      .notNull()
      .default("0"),
    shippingTotal: decimal("shipping_total", { precision: 26, scale: 8 })
      .notNull()
      .default("0"),
    shippingTaxTotal: decimal("shipping_tax_total", { precision: 26, scale: 8 })
      .notNull()
      .default("0"),
    itemTaxTotal: decimal("item_tax_total", { precision: 26, scale: 8 })
      .notNull()
      .default("0"),
    taxTotal: decimal("tax_total", { precision: 26, scale: 8 }).notNull().default("0"),
    feeTotal: decimal("fee_total", { precision: 26, scale: 8 }).notNull().default("0"),
    feeTaxTotal: decimal("fee_tax_total", { precision: 26, scale: 8 })
      .notNull()
      .default("0"),
    total: decimal("total", { precision: 26, scale: 8 }).notNull().default("0"),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    guestEmail: varchar("guest_email", { length: 320 }),
    paymentMethod: varchar("payment_method", { length: 100 }),
    paymentMethodTitle: varchar("payment_method_title", { length: 200 }),
    branchId: uuid("branch_id").references(() => branches.id, {
      onDelete: "set null",
    }),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    customerNote: text("customer_note"),
    orderNumber: varchar("order_number", { length: 50 }),
    orderKey: varchar("order_key", { length: 100 }),
    datePaidGmt: timestamp("date_paid_gmt", { withTimezone: true }),
    dateCompletedGmt: timestamp("date_completed_gmt", { withTimezone: true }),
    dateCancelledGmt: timestamp("date_cancelled_gmt", { withTimezone: true }),
    erpId: varchar("erp_id", { length: 100 }),
    erpSyncedAt: timestamp("erp_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    tenantIdx: index("orders_tenant_idx").on(t.tenantId),
    statusIdx: index("orders_status_idx").on(t.status),
    paymentStatusIdx: index("orders_payment_status_idx").on(t.paymentStatus),
    fulfillmentStatusIdx: index("orders_fulfillment_status_idx").on(t.fulfillmentStatus),
    customerIdx: index("orders_customer_idx").on(t.customerId),
    userIdx: index("orders_user_idx").on(t.userId),
    branchIdx: index("orders_branch_idx").on(t.branchId),
    orderNumberUk: unique("orders_order_number_uk").on(t.tenantId, t.orderNumber),
    orderKeyUk: unique("orders_order_key_uk").on(t.tenantId, t.orderKey),
  }),
);

export const orderAddresses = appSchema.table(
  "order_addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    addressType: varchar("address_type", { length: 20, enum: orderAddressType }).notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    company: text("company"),
    address1: text("address_1"),
    address2: text("address_2"),
    city: text("city"),
    state: text("state"),
    postcode: text("postcode"),
    country: text("country"),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("order_addresses_tenant_idx").on(t.tenantId),
    orderIdx: index("order_addresses_order_idx").on(t.orderId),
  }),
);

export const orderOperationalData = appSchema.table(
  "order_operational_data",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    createdVia: varchar("created_via", { length: 100 }).notNull().default("rest"),
    pricesIncludeTax: boolean("prices_include_tax").notNull().default(false),
    couponUsagesAreCounted: boolean("coupon_usages_are_counted").notNull().default(true),
    downloadPermissionGranted: boolean("download_permission_granted")
      .notNull()
      .default(false),
    cartHash: varchar("cart_hash", { length: 100 }),
    newOrderEmailSent: boolean("new_order_email_sent").notNull().default(false),
    orderStockReduced: boolean("order_stock_reduced").notNull().default(false),
    recordedSales: boolean("recorded_sales").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("order_operational_data_tenant_idx").on(t.tenantId),
    orderUk: unique("order_operational_data_order_uk").on(t.orderId),
  }),
);

export const orderMeta = appSchema.table(
  "order_meta",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    metaKey: varchar("meta_key", { length: 255 }).notNull(),
    metaValue: jsonb("meta_value"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("order_meta_tenant_idx").on(t.tenantId),
    orderIdx: index("order_meta_order_idx").on(t.orderId),
    metaKeyIdx: index("order_meta_key_idx").on(t.metaKey),
  }),
);

export const orderItems = appSchema.table(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    itemType: varchar("item_type", { length: 50, enum: orderItemType }).notNull(),
    name: text("name").notNull(),
    quantity: integer("quantity").notNull(),
    subtotal: decimal("subtotal", { precision: 26, scale: 8 }).notNull().default("0"),
    subtotalTax: decimal("subtotal_tax", { precision: 26, scale: 8 })
      .notNull()
      .default("0"),
    total: decimal("total", { precision: 26, scale: 8 }).notNull().default("0"),
    totalTax: decimal("total_tax", { precision: 26, scale: 8 }).notNull().default("0"),
    taxClass: varchar("tax_class", { length: 100 }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    variantId: uuid("variant_id").references(() => productVariants.id, {
      onDelete: "set null",
    }),
    sku: varchar("sku", { length: 100 }),
    methodId: varchar("method_id", { length: 100 }),
    methodTitle: varchar("method_title", { length: 200 }),
    couponId: uuid("coupon_id").references(() => coupons.id, { onDelete: "set null" }),
    code: varchar("code", { length: 100 }),
    discountAmount: decimal("discount_amount", { precision: 26, scale: 8 })
      .notNull()
      .default("0"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("order_items_tenant_idx").on(t.tenantId),
    orderIdx: index("order_items_order_idx").on(t.orderId),
    productIdx: index("order_items_product_idx").on(t.productId),
    variantIdx: index("order_items_variant_idx").on(t.variantId),
  }),
);

export const orderItemMeta = appSchema.table(
  "order_item_meta",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),
    metaKey: varchar("meta_key", { length: 255 }).notNull(),
    metaValue: jsonb("meta_value"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("order_item_meta_tenant_idx").on(t.tenantId),
    orderItemIdx: index("order_item_meta_item_idx").on(t.orderItemId),
    metaKeyIdx: index("order_item_meta_key_idx").on(t.metaKey),
  }),
);

export const orderTaxLines = appSchema.table(
  "order_tax_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    rateId: uuid("rate_id"),
    label: varchar("label", { length: 200 }).notNull(),
    rate: decimal("rate", { precision: 10, scale: 4 }).notNull(),
    compound: boolean("compound").notNull().default(false),
    itemTax: decimal("item_tax", { precision: 26, scale: 8 }).notNull().default("0"),
    shippingTax: decimal("shipping_tax", { precision: 26, scale: 8 })
      .notNull()
      .default("0"),
    feeTax: decimal("fee_tax", { precision: 26, scale: 8 }).notNull().default("0"),
    total: decimal("total", { precision: 26, scale: 8 }).notNull().default("0"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("order_tax_lines_tenant_idx").on(t.tenantId),
    orderIdx: index("order_tax_lines_order_idx").on(t.orderId),
  }),
);

export const orderDiscountLines = appSchema.table(
  "order_discount_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    couponId: uuid("coupon_id").references(() => coupons.id, { onDelete: "set null" }),
    code: varchar("code", { length: 100 }).notNull(),
    discountAmount: decimal("discount_amount", { precision: 26, scale: 8 }).notNull(),
    discountTax: decimal("discount_tax", { precision: 26, scale: 8 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("order_discount_lines_tenant_idx").on(t.tenantId),
    orderIdx: index("order_discount_lines_order_idx").on(t.orderId),
  }),
);

export const orderShippingLines = appSchema.table(
  "order_shipping_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    methodId: varchar("method_id", { length: 100 }).notNull(),
    methodTitle: varchar("method_title", { length: 200 }).notNull(),
    amount: decimal("amount", { precision: 26, scale: 8 }).notNull(),
    tax: decimal("tax", { precision: 26, scale: 8 }).notNull().default("0"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("order_shipping_lines_tenant_idx").on(t.tenantId),
    orderIdx: index("order_shipping_lines_order_idx").on(t.orderId),
  }),
);

export const orderTimeline = appSchema.table(
  "order_timeline",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50, enum: orderTimelineType }).notNull(),
    visibility: varchar("visibility", { length: 20, enum: orderTimelineVisibility })
      .notNull()
      .default("internal"),
    message: text("message").notNull(),
    metadata: jsonb("metadata"),
    actorType: varchar("actor_type", { length: 20, enum: orderTimelineActorType }).notNull(),
    actorId: uuid("actor_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("order_timeline_tenant_idx").on(t.tenantId),
    orderIdx: index("order_timeline_order_idx").on(t.orderId),
  }),
);
