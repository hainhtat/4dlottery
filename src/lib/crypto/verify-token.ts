import { createHmac, timingSafeEqual } from "crypto";

export function buildVerifyPayload(parts: {
  ticketId: string;
  roundId: string;
  number: string;
  issuedAt: string;
  status: string;
}): string {
  return [parts.ticketId, parts.roundId, parts.number, parts.issuedAt, parts.status].join("|");
}

export function signVerifyToken(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyTokenMatch(expected: string, provided: string): boolean {
  if (!expected || !provided) return false;
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(provided, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
