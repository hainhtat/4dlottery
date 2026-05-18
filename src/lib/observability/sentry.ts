import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN?.trim();
let serverInitialized = false;

export function isSentryEnabled(): boolean {
  return Boolean(dsn);
}

export function initSentryServer() {
  if (!dsn || serverInitialized) return;
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
    enabled: process.env.NODE_ENV === "production" || process.env.SENTRY_DEBUG === "1",
  });
  serverInitialized = true;
}

export function captureServerException(error: unknown, context?: Record<string, unknown>) {
  if (!dsn) return;
  Sentry.withScope((scope) => {
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        scope.setExtra(key, value);
      }
    }
    Sentry.captureException(error);
  });
}
