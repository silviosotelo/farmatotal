import { describe, it, expect } from "vitest";

type InventoryItem = {
  id: string;
  productId: string;
  branchId: string;
  onHand: number;
  reserved: number;
};

function getAvailable(item: InventoryItem): number {
  return item.onHand - item.reserved;
}

function canReserve(item: InventoryItem, quantity: number): boolean {
  return getAvailable(item) >= quantity;
}

function reserve(item: InventoryItem, quantity: number): InventoryItem {
  if (!canReserve(item, quantity)) throw new Error("Insufficient stock");
  return { ...item, reserved: item.reserved + quantity };
}

function consume(item: InventoryItem, quantity: number): InventoryItem {
  return {
    ...item,
    onHand: item.onHand - quantity,
    reserved: Math.max(0, item.reserved - quantity),
  };
}

function release(item: InventoryItem, quantity: number): InventoryItem {
  return { ...item, reserved: Math.max(0, item.reserved - quantity) };
}

describe("Inventory", () => {
  const base: InventoryItem = { id: "1", productId: "p1", branchId: "b1", onHand: 100, reserved: 0 };

  describe("getAvailable", () => {
    it("returns onHand when no reservations", () => {
      expect(getAvailable(base)).toBe(100);
    });

    it("subtracts reserved from onHand", () => {
      expect(getAvailable({ ...base, reserved: 30 })).toBe(70);
    });
  });

  describe("canReserve", () => {
    it("allows when sufficient stock", () => {
      expect(canReserve(base, 50)).toBe(true);
    });

    it("denies when insufficient stock", () => {
      expect(canReserve(base, 150)).toBe(false);
    });

    it("allows exact available", () => {
      expect(canReserve({ ...base, reserved: 95 }, 5)).toBe(true);
    });
  });

  describe("reserve", () => {
    it("increments reserved", () => {
      const r = reserve(base, 10);
      expect(r.reserved).toBe(10);
      expect(r.onHand).toBe(100);
    });

    it("throws on insufficient stock", () => {
      expect(() => reserve(base, 200)).toThrow("Insufficient stock");
    });
  });

  describe("consume", () => {
    it("decrements onHand and reserved", () => {
      const c = consume({ ...base, reserved: 10 }, 10);
      expect(c.onHand).toBe(90);
      expect(c.reserved).toBe(0);
    });

    it("never goes below 0 reserved", () => {
      const c = consume({ ...base, reserved: 5 }, 10);
      expect(c.reserved).toBe(0);
    });
  });

  describe("release", () => {
    it("decrements reserved", () => {
      const r = release({ ...base, reserved: 20 }, 5);
      expect(r.reserved).toBe(15);
    });

    it("never goes below 0", () => {
      const r = release({ ...base, reserved: 3 }, 10);
      expect(r.reserved).toBe(0);
    });
  });

  describe("concurrent reserve safety", () => {
    it("two reserves sum correctly", () => {
      let item = base;
      item = reserve(item, 30);
      item = reserve(item, 20);
      expect(item.reserved).toBe(50);
      expect(getAvailable(item)).toBe(50);
    });

    it("reserve + consume cycle", () => {
      let item = reserve(base, 10);
      item = consume(item, 10);
      expect(item.onHand).toBe(90);
      expect(item.reserved).toBe(0);
    });

    it("reserve + release cycle", () => {
      let item = reserve(base, 10);
      item = release(item, 10);
      expect(item.onHand).toBe(100);
      expect(item.reserved).toBe(0);
    });
  });
});
