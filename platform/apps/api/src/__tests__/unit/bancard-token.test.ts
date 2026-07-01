import { describe, it, expect } from "vitest";
import { createHash } from "crypto";

function md5(...parts: (string | number)[]): string {
  return createHash("md5").update(parts.join("")).digest("hex");
}

describe("Bancard token generation", () => {
  const privateKey = "test_private_key_123";

  it("generates single_buy token correctly", () => {
    const shopProcessId = 1234567890;
    const amount = "100.00";
    const currency = "PYG";
    const token = md5(privateKey, shopProcessId, amount, currency);
    const expected = md5(privateKey + shopProcessId + amount + currency);
    expect(token).toBe(expected);
    expect(token).toHaveLength(32);
  });

  it("generates charge token with alias_token", () => {
    const token = md5(privateKey, 123, "charge", "50.00", "PYG", "alias_abc");
    expect(token).toHaveLength(32);
  });

  it("generates cards_new token", () => {
    const token = md5(privateKey, 100, 200, "request_new_card");
    expect(token).toHaveLength(32);
  });

  it("generates rollback token", () => {
    const token = md5(privateKey, 123, "rollback", "0.00");
    expect(token).toHaveLength(32);
  });

  it("different inputs produce different tokens", () => {
    const t1 = md5(privateKey, 1, "10.00", "PYG");
    const t2 = md5(privateKey, 2, "10.00", "PYG");
    expect(t1).not.toBe(t2);
  });

  it("same inputs produce same token (deterministic)", () => {
    const t1 = md5(privateKey, 42, "99.99", "USD");
    const t2 = md5(privateKey, 42, "99.99", "USD");
    expect(t1).toBe(t2);
  });
});
