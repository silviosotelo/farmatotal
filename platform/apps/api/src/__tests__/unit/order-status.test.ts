import { describe, it, expect } from "vitest";

type OrderStatus = "pending" | "confirmed" | "processing" | "completed" | "cancelled" | "closed";
type PaymentStatus = "unpaid" | "pending" | "authorized" | "paid" | "partially_refunded" | "refunded" | "failed";
type FulfillmentStatus = "unfulfilled" | "processing" | "partially_fulfilled" | "fulfilled" | "returned";

const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["completed", "cancelled"],
  completed: ["closed"],
  cancelled: [],
  closed: [],
};

const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  unpaid: ["pending", "failed"],
  pending: ["authorized", "failed"],
  authorized: ["paid", "refunded", "failed"],
  paid: ["partially_refunded", "refunded"],
  partially_refunded: ["refunded"],
  refunded: [],
  failed: [],
};

const FULFILLMENT_TRANSITIONS: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  unfulfilled: ["processing", "cancelled"],
  processing: ["partially_fulfilled", "fulfilled", "cancelled"],
  partially_fulfilled: ["fulfilled", "returned"],
  fulfilled: ["returned"],
  returned: [],
};

function canTransition(from: string, to: string, transitions: Record<string, string[]>): boolean {
  return transitions[from]?.includes(to) ?? false;
}

describe("Order Status Machine", () => {
  it("pending can go to confirmed", () => {
    expect(canTransition("pending", "confirmed", ORDER_TRANSITIONS)).toBe(true);
  });

  it("pending can go to cancelled", () => {
    expect(canTransition("pending", "cancelled", ORDER_TRANSITIONS)).toBe(true);
  });

  it("pending cannot go directly to completed", () => {
    expect(canTransition("pending", "completed", ORDER_TRANSITIONS)).toBe(false);
  });

  it("completed can only go to closed", () => {
    expect(canTransition("completed", "closed", ORDER_TRANSITIONS)).toBe(true);
    expect(canTransition("completed", "cancelled", ORDER_TRANSITIONS)).toBe(false);
  });

  it("cancelled is terminal", () => {
    expect(canTransition("cancelled", "pending", ORDER_TRANSITIONS)).toBe(false);
    expect(canTransition("cancelled", "confirmed", ORDER_TRANSITIONS)).toBe(false);
  });
});

describe("Payment Status Machine", () => {
  it("unpaid can go to pending or failed", () => {
    expect(canTransition("unpaid", "pending", PAYMENT_TRANSITIONS)).toBe(true);
    expect(canTransition("unpaid", "failed", PAYMENT_TRANSITIONS)).toBe(true);
  });

  it("paid can go to refunded", () => {
    expect(canTransition("paid", "refunded", PAYMENT_TRANSITIONS)).toBe(true);
    expect(canTransition("paid", "partially_refunded", PAYMENT_TRANSITIONS)).toBe(true);
  });

  it("refunded is terminal", () => {
    expect(canTransition("refunded", "paid", PAYMENT_TRANSITIONS)).toBe(false);
  });
});

describe("Fulfillment Status Machine", () => {
  it("unfulfilled can go to processing or cancelled", () => {
    expect(canTransition("unfulfilled", "processing", FULFILLMENT_TRANSITIONS)).toBe(true);
    expect(canTransition("unfulfilled", "cancelled", FULFILLMENT_TRANSITIONS)).toBe(true);
  });

  it("fulfilled can only go to returned", () => {
    expect(canTransition("fulfilled", "returned", FULFILLMENT_TRANSITIONS)).toBe(true);
    expect(canTransition("fulfilled", "processing", FULFILLMENT_TRANSITIONS)).toBe(false);
  });

  it("returned is terminal", () => {
    expect(canTransition("returned", "fulfilled", FULFILLMENT_TRANSITIONS)).toBe(false);
  });
});
