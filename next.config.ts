import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "puppeteer-core",
    "puppeteer",
    "@sparticuz/chromium",
  ],
  /** Vercel: copy Chromium Brotli binaries into the PDF serverless function. */
  outputFileTracingIncludes: {
    "/api/tickets/pdf/[batchId]": [
      "./node_modules/@sparticuz/chromium/bin/**",
      "./node_modules/@sparticuz/chromium/build/**",
    ],
    "/api/tickets/pdf/*": [
      "./node_modules/@sparticuz/chromium/bin/**",
      "./node_modules/@sparticuz/chromium/build/**",
    ],
    "/api/tickets/png/[ticketId]": [
      "./node_modules/@sparticuz/chromium/bin/**",
      "./node_modules/@sparticuz/chromium/build/**",
    ],
    "/api/tickets/png/*": [
      "./node_modules/@sparticuz/chromium/bin/**",
      "./node_modules/@sparticuz/chromium/build/**",
    ],
  },
};

const sentryEnabled = Boolean(process.env.SENTRY_DSN?.trim());

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      disableLogger: true,
      automaticVercelMonitors: true,
    })
  : nextConfig;
