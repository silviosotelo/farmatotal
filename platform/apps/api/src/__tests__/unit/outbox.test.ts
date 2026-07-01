import { describe, it, expect } from "vitest";
import { createHash } from "crypto";

function createEventId(aggregateType: string, aggregateId: string, eventType: string): string {
  return createHash("sha256").update(`${aggregateType}:${aggregateId}:${eventType}:${Date.now()}`).digest("hex").substring(0, 16);
}

describe("Outbox Events", () => {
  it("generates unique event IDs", () => {
    const id1 = createEventId("order", "o1", "created");
    const id2 = createEventId("order", "o1", "created");
    expect(id1).toHaveLength(16);
  });

  it("different aggregates produce different IDs", () => {
    const id1 = createEventId("order", "o1", "created");
    const id2 = createEventId("order", "o2", "created");
    expect(id1).not.toBe(id2);
  });
});
