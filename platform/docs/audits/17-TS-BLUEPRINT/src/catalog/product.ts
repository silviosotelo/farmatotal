import { Money } from "../core/money.js";
import { invariant } from "../core/errors.js";

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type ProductType = "SIMPLE" | "VARIABLE";
export type BackorderPolicy = "DENY" | "ALLOW" | "ALLOW_AND_NOTIFY";

export interface ProductVariant {
  readonly id: string;
  readonly productId: string;
  readonly sku: string;
  readonly status: ProductStatus;
  readonly price: Money;
  readonly compareAtPrice?: Money;
  readonly optionValueIds: readonly string[];
  readonly soldIndividually: boolean;
  readonly stockManaged: boolean;
  readonly backorderPolicy: BackorderPolicy;
  readonly taxCategoryId?: string;
  readonly shippingProfileId?: string;
}

export class Product {
  constructor(
    public readonly id: string,
    public readonly type: ProductType,
    public status: ProductStatus,
    public title: string,
    public readonly variants: readonly ProductVariant[],
  ) {}

  getVariant(requiredVariantId?: string): ProductVariant {
    invariant(this.status === "ACTIVE", "PRODUCT_NOT_ACTIVE", "Product is not active.");

    if (this.type === "VARIABLE") {
      invariant(
        requiredVariantId,
        "VARIANT_REQUIRED",
        "A variant is required for this product.",
      );
    }

    const variant =
      this.variants.find((item) => item.id === requiredVariantId) ??
      (this.type === "SIMPLE" ? this.variants[0] : undefined);

    invariant(variant, "VARIANT_NOT_FOUND", "Variant was not found.");
    invariant(
      variant.productId === this.id,
      "INVALID_VARIANT",
      "Variant does not belong to the product.",
    );
    invariant(
      variant.status === "ACTIVE",
      "VARIANT_NOT_ACTIVE",
      "Variant is not active.",
    );

    return variant;
  }
}

export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
  getRequired(id: string): Promise<Product>;
}
