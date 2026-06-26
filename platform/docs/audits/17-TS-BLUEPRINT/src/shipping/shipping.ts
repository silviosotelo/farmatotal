import { Cart } from "../cart/cart.js";
import { Money } from "../core/money.js";
import { Address } from "../tax/tax.js";

export interface ShippingRate {
  readonly id: string;
  readonly provider: string;
  readonly service: string;
  readonly amount: Money;
  readonly taxAmount: Money;
  readonly expiresAt?: Date;
  readonly estimatedMinDays?: number;
  readonly estimatedMaxDays?: number;
}

export interface ShippingService {
  quote(input: {
    cart: Cart;
    destination: Address;
  }): Promise<readonly ShippingRate[]>;

  getRequiredValidRate(input: {
    cart: Cart;
    destination: Address;
    rateId: string;
    now: Date;
  }): Promise<ShippingRate>;
}
