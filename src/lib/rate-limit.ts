import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitBucket = "ticket-issue" | "check-number" | "verify";

const LIMITS: Record<RateLimitBucket, { requests: number; window: `${number} s` | `${number} m` }> = {
  "ticket-issue": { requests: 30, window: "1 m" },
  "check-number": { requests: 120, window: "1 m" },
  verify: { requests: 60, window: "1 m" },
};

type MemoryEntry = { count: number; resetAt: number };

const memoryStores = new Map<string, MemoryEntry>();

function memoryLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number; reset: number } {
  const now = Date.now();
  let entry = memoryStores.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    memoryStores.set(key, entry);
  }
  entry.count += 1;
  const success = entry.count <= limit;
  return {
    success,
    remaining: Math.max(0, limit - entry.count),
    reset: entry.resetAt,
  };
}

function windowMs(window: `${number} s` | `${number} m`): number {
  const n = parseInt(window, 10);
  return window.endsWith("m") ? n * 60_000 : n * 1000;
}

const upstashLimiters = new Map<RateLimitBucket, Ratelimit>();

function getUpstashLimiter(bucket: RateLimitBucket): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  if (!upstashLimiters.has(bucket)) {
    const cfg = LIMITS[bucket];
    upstashLimiters.set(
      bucket,
      new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(cfg.requests, cfg.window),
        prefix: `lottery:${bucket}`,
        analytics: false,
      })
    );
  }
  return upstashLimiters.get(bucket)!;
}

function upstashConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

export async function enforceRateLimit(
  bucket: RateLimitBucket,
  identifier: string
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const cfg = LIMITS[bucket];
  const key = `${bucket}:${identifier}`;
  const limiter = getUpstashLimiter(bucket);

  if (process.env.NODE_ENV === "production" && !upstashConfigured()) {
    console.error(
      "[rate-limit] UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production"
    );
    return { ok: false, retryAfterSec: 60 };
  }

  if (limiter) {
    const result = await limiter.limit(key);
    if (!result.success) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((result.reset - Date.now()) / 1000)
      );
      return { ok: false, retryAfterSec };
    }
    return { ok: true };
  }

  const mem = memoryLimit(key, cfg.requests, windowMs(cfg.window));
  if (!mem.success) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((mem.reset - Date.now()) / 1000)),
    };
  }
  return { ok: true };
}

export const RATE_LIMIT_MESSAGE = "Too many requests. Please wait and try again.";
