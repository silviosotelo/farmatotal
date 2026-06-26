import { Money } from "../core/money.js";

export interface Address {
  readonly country: string;
  readonly state?: string;
  readonly city?: string;
  readonly postcode?: string;
  readonly line1?: string;
  readonly line2?: string;
}

export interface TaxableLine {
  readonly id: string;
  readonly taxCategoryId?: string;
  readonly taxableAmount: Money;
}

export interface TaxLine {
  readonly taxableLineId: string;
  readonly rateId: string;
  readonly rateName: string;
  readonly amount: Money;
}

export interface TaxEngine {
  calculate(input: {
    origin: Address;
    destination: Address;
    customerId?: string;
    customerTaxExempt: boolean;
    lines: readonly TaxableLine[];
  }): Promise<readonly TaxLine[]>;
}
