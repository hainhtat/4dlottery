import { describe, expect, it } from "vitest";
import { assertBatchTicketCount, MAX_TICKETS_PER_BATCH } from "./batch-limits";

describe("batch-limits", () => {
  it("exports a positive max", () => {
    expect(MAX_TICKETS_PER_BATCH).toBe(20);
  });

  it("allows 1..max tickets", () => {
    expect(() => assertBatchTicketCount(1)).not.toThrow();
    expect(() => assertBatchTicketCount(MAX_TICKETS_PER_BATCH)).not.toThrow();
  });

  it("rejects empty or over max", () => {
    expect(() => assertBatchTicketCount(0)).toThrow(/At least one/);
    expect(() => assertBatchTicketCount(MAX_TICKETS_PER_BATCH + 1)).toThrow(/Maximum/);
  });
});
