import { Money } from "../core/money.js";

export type PaymentAttemptStatus =
  | "CREATED"
  | "REQUIRES_ACTION"
  | "PROCESSING"
  | "AUTHORIZED"
  | "CAPTURED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export interface PaymentAttempt {
  readonly id: string;
  readonly orderId: string;
  readonly gateway: string;
  readonly amount: Money;
  readonly status: PaymentAttemptStatus;
  readonly externalId?: string;
  readonly redirectUrl?: string;
}

export interface PaymentGateway {
  readonly id: string;

  supports(input: {
    currency: string;
    amount: Money;
    customerId?: string;
  }): Promise<boolean>;

  createPayment(input: {
    orderId: string;
    amount: Money;
    idempotencyKey: string;
    returnUrl: string;
    cancelUrl: string;
  }): Promise<PaymentAttempt>;

  refund(input: {
    orderId: string;
    paymentAttemptId: string;
    amount: Money;
    idempotencyKey: string;
  }): Promise<void>;
}

export interface PaymentGatewayRegistry {
  getRequired(id: string): PaymentGateway;
}
