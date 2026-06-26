import { Money } from "../core/money.js";
import { invariant } from "../core/errors.js";
import { Address } from "../tax/tax.js";

export type OrderStatus =
  | "DRAFT"
  | "PLACED"
  | "CONFIRMED"
  | "CANCELLED"
  | "CLOSED";

export type PaymentStatus =
  | "UNPAID"
  | "PENDING"
  | "AUTHORIZED"
  | "PAID"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED"
  | "FAILED";

export type FulfillmentStatus =
  | "UNFULFILLED"
  | "PROCESSING"
  | "PARTIALLY_FULFILLED"
  | "FULFILLED"
  | "RETURNED";

export interface OrderLine {
  readonly id: string;
  readonly productId: string;
  readonly variantId: string;
  readonly sku: string;
  readonly name: string;
  readonly quantity: bigint;
  readonly unitPrice: Money;
  readonly subtotal: Money;
  readonly discountTotal: Money;
  readonly taxTotal: Money;
  readonly total: Money;
  readonly metadata: Readonly<Record<string, unknown>>;
}

const allowedOrderTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  DRAFT: ["PLACED", "CANCELLED"],
  PLACED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CANCELLED", "CLOSED"],
  CANCELLED: [],
  CLOSED: [],
};

export class Order {
  constructor(
    public readonly id: string,
    public readonly customerId: string | undefined,
    public status: OrderStatus,
    public paymentStatus: PaymentStatus,
    public fulfillmentStatus: FulfillmentStatus,
    public readonly currency: string,
    public readonly total: Money,
    public readonly lines: readonly OrderLine[],
    public readonly billingAddress: Address,
    public readonly shippingAddress: Address,
    public readonly createdAt: Date,
    public paidAt?: Date,
  ) {}

  transitionTo(nextStatus: OrderStatus): void {
    invariant(
      allowedOrderTransitions[this.status].includes(nextStatus),
      "INVALID_ORDER_TRANSITION",
      `Cannot move order from ${this.status} to ${nextStatus}.`,
    );
    this.status = nextStatus;
  }

  markPaid(now: Date): void {
    invariant(
      this.paymentStatus !== "PAID",
      "ORDER_ALREADY_PAID",
      "Order is already paid.",
    );
    this.paymentStatus = "PAID";
    this.paidAt = now;

    if (this.status === "PLACED") {
      this.status = "CONFIRMED";
    }
  }
}

export interface OrderRepository {
  getRequired(id: string): Promise<Order>;
  save(order: Order): Promise<void>;
  create(order: Order): Promise<void>;
  findByIdempotencyKey(key: string): Promise<Order | null>;
}
