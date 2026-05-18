import { describe, expect, it } from "vitest";
import { parseVerifyQrPayload } from "./parse-verify-qr";

describe("parseVerifyQrPayload", () => {
  it("parses path-style verify URL", () => {
    const result = parseVerifyQrPayload(
      "https://4dlottery.vercel.app/verify/ABC123DEF456/aa11bb22cc33"
    );
    expect(result).toEqual({
      publicId: "ABC123DEF456",
      token: "aa11bb22cc33",
    });
  });

  it("parses query token verify URL", () => {
    const result = parseVerifyQrPayload("/verify/ABC123?t=deadbeef");
    expect(result).toEqual({ publicId: "ABC123", token: "deadbeef" });
  });

  it("returns null for invalid content", () => {
    expect(parseVerifyQrPayload("https://example.com")).toBeNull();
    expect(parseVerifyQrPayload("")).toBeNull();
  });
});
