import { ProductVariant } from "../catalog/product.js";
import { Money } from "../core/money.js";
import { invariant } from "../core/errors.js";

export interface CartItemOptions {
  readonly optionValueIds?: readonly string[];
  readonly customization?: Readonly<Record<string, string>>;
}

export interface CartItem {
  readonly id: string;
  readonly lineKey: string;
  readonly productId: string;
  readonly variantId: string;
  readonly sku: string;
  quantity: bigint;
  readonly options: CartItemOptions;
  unitPrice: Money;
}

export interface CartTotals {
  readonly subtotal: Money;
  readonly discountTotal: Money;
  readonly itemTaxTotal: Money;
  readonly shippingTotal: Money;
  readonly shippingTaxTotal: Money;
  readonly feeTotal: Money;
  readonly feeTaxTotal: Money;
  readonly grandTotal: Money;
}

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function stableHash(value: string): string {
  // FNV-1a 64-bit. This key identifies equivalent cart lines; it is not
  // intended for passwords, signatures, or other security-sensitive uses.
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;

  for (const character of value) {
    hash ^= BigInt(character.codePointAt(0) ?? 0);
    hash = BigInt.asUintN(64, hash * prime);
  }

  return hash.toString(16).padStart(16, "0");
}

export function createLineKey(input: {
  productId: string;
  variantId: string;
  options: CartItemOptions;
}): string {
  return stableHash(canonicalize(input));
}

export class Cart {
  public readonly items: CartItem[] = [];
  public readonly couponCodes: string[] = [];
  public totals: CartTotals | undefined;
  public selectedShippingRateId?: string;

  constructor(
    public readonly id: string,
    public readonly currency: string,
    public status: "ACTIVE" | "CONVERTED" | "ABANDONED" | "EXPIRED",
    public version: number,
    public readonly customerId?: string,
  ) {}

  addItem(
    productId: string,
    variant: ProductVariant,
    quantity: bigint,
    options: CartItemOptions = {},
  ): CartItem {
    invariant(this.status === "ACTIVE", "CART_NOT_ACTIVE", "Cart is not active.");
    invariant(quantity > 0n, "INVALID_QUANTITY", "Quantity must be positive.");
    invariant(
      variant.price.currency === this.currency,
      "CURRENCY_MISMATCH",
      "Variant currency does not match cart currency.",
    );

    const lineKey = createLineKey({
      productId,
      variantId: variant.id,
      options,
    });

    const existing = this.items.find((item) => item.lineKey === lineKey);

    if (existing) {
      invariant(
        !variant.soldIndividually,
        "SOLD_INDIVIDUALLY",
        "This item can only be purchased once.",
      );
      existing.quantity += quantity;
      this.touch();
      return existing;
    }

    const item: CartItem = {
      id: crypto.randomUUID(),
      lineKey,
      productId,
      variantId: variant.id,
      sku: variant.sku,
      quantity,
      options,
      unitPrice: variant.price,
    };

    this.items.push(item);
    this.touch();
    return item;
  }

  setQuantity(lineId: string, quantity: bigint): void {
    const index = this.items.findIndex((item) => item.id === lineId);
    invariant(index >= 0, "CART_ITEM_NOT_FOUND", "Cart item was not found.");

    if (quantity <= 0n) {
      this.items.splice(index, 1);
    } else {
      const item = this.items[index];
      invariant(item, "CART_ITEM_NOT_FOUND", "Cart item was not found.");
      item.quantity = quantity;
    }

    this.touch();
  }

  applyCoupon(code: string): void {
    const normalized = code.trim().toUpperCase();
    invariant(normalized.length > 0, "INVALID_COUPON", "Coupon code is empty.");

    if (!this.couponCodes.includes(normalized)) {
      this.couponCodes.push(normalized);
      this.touch();
    }
  }

  markConverted(): void {
    invariant(this.status === "ACTIVE", "CART_NOT_ACTIVE", "Cart is not active.");
    this.status = "CONVERTED";
    this.touch();
  }

  private touch(): void {
    this.version += 1;
    this.totals = undefined;
  }
}

export interface CartRepository {
  getRequired(id: string): Promise<Cart>;
  save(cart: Cart): Promise<void>;
}
