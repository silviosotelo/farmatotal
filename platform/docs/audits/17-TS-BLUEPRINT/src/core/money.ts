export type Currency = string;

export interface Money {
  readonly amount: bigint;
  readonly currency: Currency;
}

export function money(amount: bigint, currency: Currency): Money {
  if (!currency || currency.length < 3) {
    throw new Error("Invalid currency.");
  }
  return { amount, currency: currency.toUpperCase() };
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount + b.amount, a.currency);
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount - b.amount, a.currency);
}

export function multiplyMoney(value: Money, quantity: bigint): Money {
  return money(value.amount * quantity, value.currency);
}

export function zeroMoney(currency: Currency): Money {
  return money(0n, currency);
}

export function serializeMoney(value: Money): {
  amount: string;
  currency: string;
} {
  return { amount: value.amount.toString(), currency: value.currency };
}
