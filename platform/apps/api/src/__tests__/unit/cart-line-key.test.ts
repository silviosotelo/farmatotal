import { describe, it, expect } from "vitest";
import { createHash } from "crypto";

function createLineKey(productId: string, variantId?: string, options?: Record<string, string>): string {
  const parts = [productId];
  if (variantId) parts.push(variantId);
  if (options) {
    const sorted = Object.keys(options).sort().map((k) => `${k}=${options[k]}`);
    parts.push(...sorted);
  }
  return createHash("sha256").update(parts.join(":")).digest("hex").substring(0, 16);
}

describe("Cart line key", () => {
  it("same product = same key", () => {
    expect(createLineKey("p1")).toBe(createLineKey("p1"));
  });

  it("different product = different key", () => {
    expect(createLineKey("p1")).not.toBe(createLineKey("p2"));
  });

  it("variant affects key", () => {
    expect(createLineKey("p1", "v1")).not.toBe(createLineKey("p1", "v2"));
  });

  it("options affect key", () => {
    const k1 = createLineKey("p1", undefined, { color: "red" });
    const k2 = createLineKey("p1", undefined, { color: "blue" });
    expect(k1).not.toBe(k2);
  });

  it("options order does not affect key", () => {
    const k1 = createLineKey("p1", undefined, { color: "red", size: "L" });
    const k2 = createLineKey("p1", undefined, { size: "L", color: "red" });
    expect(k1).toBe(k2);
  });

  it("key is 16 chars hex", () => {
    const key = createLineKey("product-123");
    expect(key).toHaveLength(16);
    expect(/^[0-9a-f]+$/.test(key)).toBe(true);
  });
});
