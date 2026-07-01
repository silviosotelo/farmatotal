import { describe, it, expect } from "vitest";

function calculateLineTotal(unitPrice: number, quantity: number, discount: number = 0): number {
  const subtotal = unitPrice * quantity;
  const discountAmount = subtotal * (discount / 100);
  return Math.round((subtotal - discountAmount) * 100) / 100;
}

function calculateTax(subtotal: number, rate: number): number {
  return Math.round(subtotal * rate * 100) / 100;
}

function calculateOrderTotal(items: Array<{ subtotal: number; tax: number }>, shipping: number, discount: number = 0): number {
  const itemTotal = items.reduce((sum, i) => sum + i.subtotal + i.tax, 0);
  return Math.round((itemTotal + shipping - discount) * 100) / 100;
}

describe("Price Calculations", () => {
  describe("Line total", () => {
    it("calculates basic line total", () => {
      expect(calculateLineTotal(10000, 3)).toBe(30000);
    });

    it("applies percentage discount", () => {
      expect(calculateLineTotal(10000, 2, 10)).toBe(18000);
    });

    it("handles zero quantity", () => {
      expect(calculateLineTotal(10000, 0)).toBe(0);
    });
  });

  describe("Tax calculation", () => {
    it("calculates 10% IVA", () => {
      expect(calculateTax(100000, 0.10)).toBe(10000);
    });

    it("calculates 5% IVA", () => {
      expect(calculateTax(100000, 0.05)).toBe(5000);
    });

    it("handles zero rate (exento)", () => {
      expect(calculateTax(100000, 0)).toBe(0);
    });
  });

  describe("Order total", () => {
    it("sums items + shipping - discount", () => {
      const items = [
        { subtotal: 50000, tax: 5000 },
        { subtotal: 30000, tax: 3000 },
      ];
      expect(calculateOrderTotal(items, 10000, 5000)).toBe(93000);
    });

    it("handles empty items", () => {
      expect(calculateOrderTotal([], 0)).toBe(0);
    });

    it("handles negative discount", () => {
      expect(calculateOrderTotal([{ subtotal: 100000, tax: 0 }], 0, 0)).toBe(100000);
    });
  });
});
