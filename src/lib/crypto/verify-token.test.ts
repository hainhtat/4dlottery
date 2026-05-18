import { describe, expect, it } from "vitest";
import {
  buildVerifyPayload,
  signVerifyToken,
  verifyTokenMatch,
} from "./verify-token";

const SECRET = "test-secret-for-unit-tests-only";

describe("verify-token", () => {
  it("builds a stable payload string", () => {
    const payload = buildVerifyPayload({
      ticketId: "tid",
      roundId: "rid",
      number: "1234",
      issuedAt: "2026-01-01T00:00:00Z",
      status: "active",
    });
    expect(payload).toBe("tid|rid|1234|2026-01-01T00:00:00Z|active");
  });

  it("signs and verifies matching tokens", () => {
    const payload = buildVerifyPayload({
      ticketId: "a",
      roundId: "b",
      number: "0001",
      issuedAt: "t",
      status: "active",
    });
    const token = signVerifyToken(payload, SECRET);
    expect(verifyTokenMatch(token, token)).toBe(true);
    expect(verifyTokenMatch(signVerifyToken(payload, SECRET), token)).toBe(true);
  });

  it("rejects wrong token or malformed hex", () => {
    const payload = buildVerifyPayload({
      ticketId: "a",
      roundId: "b",
      number: "0001",
      issuedAt: "t",
      status: "active",
    });
    const token = signVerifyToken(payload, SECRET);
    expect(verifyTokenMatch(token, "deadbeef")).toBe(false);
    expect(verifyTokenMatch(token, "not-hex")).toBe(false);
    expect(verifyTokenMatch("", token)).toBe(false);
  });
});
