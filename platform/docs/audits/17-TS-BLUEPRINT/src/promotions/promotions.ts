import { Cart } from "../cart/cart.js";
import { Money } from "../core/money.js";

export interface LineDiscount {
  readonly cartItemId: string;
  readonly promotionId: string;
  readonly couponCode?: string;
  readonly amount: Money;
}

export interface PromotionResult {
  readonly discounts: readonly LineDiscount[];
  readonly freeShipping: boolean;
}

export interface PromotionEngine {
  calculate(cart: Cart): Promise<PromotionResult>;
  reserveUsage(input: {
    orderId: string;
    cart: Cart;
    expiresAt: Date;
  }): Promise<void>;
  commitUsage(orderId: string): Promise<void>;
  releaseUsage(orderId: string): Promise<void>;
}
