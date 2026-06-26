import { InventoryService } from "../inventory/inventory.js";
import { OrderRepository } from "../orders/order.js";
import { Outbox, DomainEvent } from "../core/events.js";
import { TransactionManager } from "../core/transaction.js";

export interface PaymentCapturedCommand {
  readonly provider: string;
  readonly externalEventId: string;
  readonly orderId: string;
  readonly paymentAttemptId: string;
  readonly inventoryReservationId: string;
  readonly transactionId: string;
}

export interface WebhookReceiptRepository {
  wasProcessed(provider: string, externalEventId: string): Promise<boolean>;
  markProcessed(provider: string, externalEventId: string): Promise<void>;
}

export class PaymentWebhookService {
  constructor(
    private readonly receipts: WebhookReceiptRepository,
    private readonly orders: OrderRepository,
    private readonly inventory: InventoryService,
    private readonly tx: TransactionManager,
    private readonly outbox: Outbox,
  ) {}

  async captured(command: PaymentCapturedCommand): Promise<void> {
    await this.tx.run(async () => {
      if (
        await this.receipts.wasProcessed(
          command.provider,
          command.externalEventId,
        )
      ) {
        return;
      }

      const order = await this.orders.getRequired(command.orderId);

      if (order.paymentStatus !== "PAID") {
        order.markPaid(new Date());
        await this.orders.save(order);

        await this.inventory.consume(
          command.inventoryReservationId,
          `${command.provider}:${command.externalEventId}:consume`,
        );
      }

      const events: DomainEvent[] = [
        {
          id: crypto.randomUUID(),
          type: "PaymentCaptured",
          aggregateType: "Order",
          aggregateId: order.id,
          occurredAt: new Date(),
          payload: {
            orderId: order.id,
            paymentAttemptId: command.paymentAttemptId,
            transactionId: command.transactionId,
          },
        },
        {
          id: crypto.randomUUID(),
          type: "OrderConfirmed",
          aggregateType: "Order",
          aggregateId: order.id,
          occurredAt: new Date(),
          payload: { orderId: order.id },
        },
      ];

      await this.outbox.append(events);
      await this.receipts.markProcessed(
        command.provider,
        command.externalEventId,
      );
    });
  }
}
