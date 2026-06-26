import { ProductVariant } from "../catalog/product.js";

export interface InventoryAvailability {
  readonly variantId: string;
  readonly onHand: bigint;
  readonly reserved: bigint;
  readonly available: bigint;
}

export interface InventoryReservationLine {
  readonly variantId: string;
  readonly quantity: bigint;
}

export interface InventoryReservation {
  readonly id: string;
  readonly orderId: string;
  readonly expiresAt: Date;
  readonly lines: readonly InventoryReservationLine[];
}

export interface InventoryService {
  getAvailability(variantId: string): Promise<InventoryAvailability>;

  assertCanAdd(
    variant: ProductVariant,
    quantity: bigint,
    quantityAlreadyInCart: bigint,
  ): Promise<void>;

  reserve(input: {
    orderId: string;
    lines: readonly InventoryReservationLine[];
    expiresAt: Date;
    idempotencyKey: string;
  }): Promise<InventoryReservation>;

  consume(reservationId: string, idempotencyKey: string): Promise<void>;

  release(reservationId: string, idempotencyKey: string): Promise<void>;
}
