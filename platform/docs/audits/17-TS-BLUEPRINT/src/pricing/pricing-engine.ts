import {
  addMoney,
  Money,
  multiplyMoney,
  subtractMoney,
  zeroMoney,
} from "../core/money.js";
import { Cart, CartTotals } from "../cart/cart.js";
import { PromotionEngine } from "../promotions/promotions.js";
import { TaxEngine, Address } from "../tax/tax.js";
import { ShippingRate } from "../shipping/shipping.js";

export interface PricingContext {
  readonly cart: Cart;
  readonly origin: Address;
  readonly destination: Address;
  readonly customerTaxExempt: boolean;
  readonly selectedShippingRate?: ShippingRate;
}

export interface PricingEngine {
  calculate(context: PricingContext): Promise<CartTotals>;
}

export class DefaultPricingEngine implements PricingEngine {
  constructor(
    private readonly promotions: PromotionEngine,
    private readonly taxes: TaxEngine,
  ) {}

  async calculate(context: PricingContext): Promise<CartTotals> {
    const currency = context.cart.currency;
    let subtotal = zeroMoney(currency);

    for (const item of context.cart.items) {
      subtotal = addMoney(
        subtotal,
        multiplyMoney(item.unitPrice, item.quantity),
      );
    }

    const promotionResult = await this.promotions.calculate(context.cart);
    let discountTotal = zeroMoney(currency);

    for (const discount of promotionResult.discounts) {
      discountTotal = addMoney(discountTotal, discount.amount);
    }

    const discountedItemsTotal = subtractMoney(subtotal, discountTotal);

    const taxLines = await this.taxes.calculate({
      origin: context.origin,
      destination: context.destination,
      ...(context.cart.customerId
        ? { customerId: context.cart.customerId }
        : {}),
      customerTaxExempt: context.customerTaxExempt,
      lines: context.cart.items.map((item) => ({
        id: item.id,
        taxableAmount: multiplyMoney(item.unitPrice, item.quantity),
      })),
    });

    let itemTaxTotal = zeroMoney(currency);
    for (const line of taxLines) {
      itemTaxTotal = addMoney(itemTaxTotal, line.amount);
    }

    const shippingTotal =
      promotionResult.freeShipping || !context.selectedShippingRate
        ? zeroMoney(currency)
        : context.selectedShippingRate.amount;

    const shippingTaxTotal =
      promotionResult.freeShipping || !context.selectedShippingRate
        ? zeroMoney(currency)
        : context.selectedShippingRate.taxAmount;

    const feeTotal = zeroMoney(currency);
    const feeTaxTotal = zeroMoney(currency);

    let grandTotal = discountedItemsTotal;
    grandTotal = addMoney(grandTotal, itemTaxTotal);
    grandTotal = addMoney(grandTotal, shippingTotal);
    grandTotal = addMoney(grandTotal, shippingTaxTotal);
    grandTotal = addMoney(grandTotal, feeTotal);
    grandTotal = addMoney(grandTotal, feeTaxTotal);

    return {
      subtotal,
      discountTotal,
      itemTaxTotal,
      shippingTotal,
      shippingTaxTotal,
      feeTotal,
      feeTaxTotal,
      grandTotal,
    };
  }
}
