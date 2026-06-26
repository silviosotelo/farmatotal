import { CartRepository } from "../cart/cart.js";
import { DomainEvent, Outbox } from "../core/events.js";
import { invariant } from "../core/errors.js";
import { TransactionManager } from "../core/transaction.js";
import { InventoryService } from "../inventory/inventory.js";
import { Order, OrderLine, OrderRepository } from "../orders/order.js";
import {
  PaymentAttempt,
  PaymentGatewayRegistry,
} from "../payments/payments.js";
import { PricingEngine } from "../pricing/pricing-engine.js";
import { PromotionEngine } from "../promotions/promotions.js";
import { Address } from "../tax/tax.js";
import { ShippingService } from "../shipping/shipping.js";
import {
  multiplyMoney,
  subtractMoney,
  zeroMoney,
} from "../core/money.js";

export interface PlaceOrderCommand {
  readonly cartId: string;
  readonly expectedCartVersion: number;
  readonly billingAddress: Address;
  readonly shippingAddress: Address;
  readonly shippingRateId: string;
  readonly paymentGatewayId: string;
  readonly idempotencyKey: string;
  readonly returnUrl: string;
  readonly cancelUrl: string;
}

export interface PlaceOrderResult {
  readonly order: Order;
  readonly payment: PaymentAttempt;
}

export class CheckoutService {
  constructor(
    private readonly carts: CartRepository,
    private readonly orders: OrderRepository,
    private readonly inventory: InventoryService,
    private readonly promotions: PromotionEngine,
    private readonly shipping: ShippingService,
    private readonly pricing: PricingEngine,
    private readonly gateways: PaymentGatewayRegistry,
    private readonly tx: TransactionManager,
    private readonly outbox: Outbox,
  ) {}

  async placeOrder(command: PlaceOrderCommand): Promise<PlaceOrderResult> {
    return this.tx.run(async () => {
      const previous = await this.orders.findByIdempotencyKey(
        command.idempotencyKey,
      );

      invariant(
        !previous,
        "IDEMPOTENCY_REPLAY_REQUIRES_STORED_RESPONSE",
        "Return the previously stored checkout response.",
      );

      const cart = await this.carts.getRequired(command.cartId);

      invariant(cart.status === "ACTIVE", "CART_NOT_ACTIVE", "Cart is not active.");
      invariant(
        cart.version === command.expectedCartVersion,
        "CART_CHANGED",
        "Cart changed and must be reviewed.",
      );
      invariant(cart.items.length > 0, "EMPTY_CART", "Cart is empty.");

      const shippingRate = await this.shipping.getRequiredValidRate({
        cart,
        destination: command.shippingAddress,
        rateId: command.shippingRateId,
        now: new Date(),
      });

      const totals = await this.pricing.calculate({
        cart,
        origin: { country: "PY" },
        destination: command.shippingAddress,
        customerTaxExempt: false,
        selectedShippingRate: shippingRate,
      });

      cart.totals = totals;

      const orderId = crypto.randomUUID();
      const reservation = await this.inventory.reserve({
        orderId,
        lines: cart.items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        idempotencyKey: `${command.idempotencyKey}:inventory`,
      });

      await this.promotions.reserveUsage({
        orderId,
        cart,
        expiresAt: reservation.expiresAt,
      });

      const totalQuantity = cart.items.reduce(
        (sum, item) => sum + item.quantity,
        0n,
      );
      const allocatedDiscountPerUnit =
        totalQuantity > 0n
          ? totals.discountTotal.amount / totalQuantity
          : 0n;

      const orderLines: OrderLine[] = cart.items.map((item) => {
        const subtotal = multiplyMoney(item.unitPrice, item.quantity);
        const discountAmount = {
          amount: allocatedDiscountPerUnit * item.quantity,
          currency: cart.currency,
        };
        const total = subtractMoney(subtotal, discountAmount);

        return {
          id: crypto.randomUUID(),
          productId: item.productId,
          variantId: item.variantId,
          sku: item.sku,
          name: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal,
          discountTotal: discountAmount,
          taxTotal: zeroMoney(cart.currency),
          total,
          metadata: { options: item.options },
        };
      });

      const order = new Order(
        orderId,
        cart.customerId,
        "PLACED",
        "PENDING",
        "UNFULFILLED",
        cart.currency,
        totals.grandTotal,
        orderLines,
        command.billingAddress,
        command.shippingAddress,
        new Date(),
      );

      await this.orders.create(order);

      const gateway = this.gateways.getRequired(command.paymentGatewayId);
      const supported = await gateway.supports({
        currency: order.currency,
        amount: order.total,
        ...(order.customerId ? { customerId: order.customerId } : {}),
      });

      invariant(
        supported,
        "PAYMENT_METHOD_UNAVAILABLE",
        "Payment method is unavailable.",
      );

      const payment = await gateway.createPayment({
        orderId: order.id,
        amount: order.total,
        idempotencyKey: `${command.idempotencyKey}:payment`,
        returnUrl: command.returnUrl,
        cancelUrl: command.cancelUrl,
      });

      cart.markConverted();
      await this.carts.save(cart);

      const events: DomainEvent[] = [
        {
          id: crypto.randomUUID(),
          type: "OrderPlaced",
          aggregateType: "Order",
          aggregateId: order.id,
          occurredAt: new Date(),
          payload: {
            orderId: order.id,
            cartId: cart.id,
            paymentAttemptId: payment.id,
            inventoryReservationId: reservation.id,
          },
        },
      ];

      await this.outbox.append(events);

      return { order, payment };
    });
  }
}
