import { NextResponse } from "next/server";
import { RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

export function rateLimitResponse(retryAfterSec: number) {
  return NextResponse.json(
    { error: RATE_LIMIT_MESSAGE },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    }
  );
}
