import { existsSync } from "node:fs";
import type { Browser } from "puppeteer-core";
import { isPdfServerless } from "./pdf-env";

const LAUNCH_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--no-first-run",
  "--no-zygote",
  "--disable-extensions",
];

/** Reuse Chromium on warm serverless instances instead of cold-launching every PDF. */
const SERVERLESS_BROWSER_TTL_MS = 120_000;

/** Cap parallel PDF renders per Node process (local dev / long-lived server). */
const MAX_CONCURRENT_PDF_RENDERS = 2;

function systemChromeCandidates(): string[] {
  const platform = process.platform;
  if (platform === "darwin") {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    ];
  }
  if (platform === "win32") {
    const local = process.env.LOCALAPPDATA ?? "";
    const pf = process.env["PROGRAMFILES"] ?? "C:\\Program Files";
    return [
      `${pf}\\Google\\Chrome\\Application\\chrome.exe`,
      `${local}\\Google\\Chrome\\Application\\chrome.exe`,
      `${pf}\\Chromium\\Application\\chrome.exe`,
    ];
  }
  return [
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
}

function findSystemChrome(): string | undefined {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  for (const candidate of systemChromeCandidates()) {
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

async function resolveChromeExecutablePath(): Promise<string> {
  if (isPdfServerless()) {
    const chromium = await import("@sparticuz/chromium");
    return chromium.default.executablePath();
  }

  const system = findSystemChrome();
  if (system) return system;

  try {
    const puppeteer = await import("puppeteer");
    const bundled = puppeteer.default.executablePath();
    if (typeof bundled === "string" && existsSync(bundled)) return bundled;
  } catch {
    /* puppeteer cache may be empty */
  }

  throw new Error(
    [
      "Chrome/Chromium not found for PDF ticket export.",
      "",
      "Fix (pick one):",
      "  • Install Google Chrome (recommended on Mac/Windows), or",
      "  • Run: npm run setup:chrome",
      "  • Set PUPPETEER_EXECUTABLE_PATH to your chrome binary",
    ].join("\n")
  );
}

async function launchBrowser(): Promise<Browser> {
  const puppeteer = await import("puppeteer-core");
  const executablePath = await resolveChromeExecutablePath();

  const launchOptions: Parameters<typeof puppeteer.default.launch>[0] = {
    executablePath,
    headless: true,
    args: LAUNCH_ARGS,
  };

  if (isPdfServerless()) {
    const chromium = await import("@sparticuz/chromium");
    launchOptions.args = chromium.default.args;
  }

  return puppeteer.default.launch(launchOptions);
}

let devBrowser: Browser | null = null;
let serverlessBrowser: Browser | null = null;
let serverlessBrowserExpiresAt = 0;

class PdfRenderSemaphore {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly max: number) {}

  async acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active += 1;
      return;
    }
    await new Promise<void>((resolve) => this.queue.push(resolve));
    this.active += 1;
  }

  release(): void {
    this.active = Math.max(0, this.active - 1);
    const next = this.queue.shift();
    if (next) next();
  }
}

const pdfSemaphore = new PdfRenderSemaphore(MAX_CONCURRENT_PDF_RENDERS);

async function getServerlessBrowser(): Promise<Browser> {
  const now = Date.now();
  if (serverlessBrowser?.connected && now < serverlessBrowserExpiresAt) {
    return serverlessBrowser;
  }

  if (serverlessBrowser?.connected) {
    await serverlessBrowser.close().catch(() => undefined);
  }

  serverlessBrowser = await launchBrowser();
  serverlessBrowserExpiresAt = now + SERVERLESS_BROWSER_TTL_MS;
  serverlessBrowser.on("disconnected", () => {
    serverlessBrowser = null;
    serverlessBrowserExpiresAt = 0;
  });
  return serverlessBrowser;
}

/** Obtain a browser for PDF rendering (warm reuse on serverless, pooled locally). */
export async function acquirePdfBrowser(): Promise<Browser> {
  if (isPdfServerless()) {
    return getServerlessBrowser();
  }

  if (devBrowser?.connected) {
    return devBrowser;
  }

  devBrowser = await launchBrowser();
  devBrowser.on("disconnected", () => {
    devBrowser = null;
  });
  return devBrowser;
}

/**
 * Limits concurrent PDF jobs and serializes browser teardown policy.
 * Always pair with {@link releasePdfBrowser} in a finally block.
 */
export async function enterPdfRenderSlot(): Promise<void> {
  await pdfSemaphore.acquire();
}

export function leavePdfRenderSlot(): void {
  pdfSemaphore.release();
}

/** Serverless: keep browser warm for TTL. Local: shared dev browser stays open. */
export async function releasePdfBrowser(browser: Browser): Promise<void> {
  if (isPdfServerless()) {
    if (!browser.connected) {
      serverlessBrowser = null;
      serverlessBrowserExpiresAt = 0;
    }
    return;
  }

  if (browser !== devBrowser && browser.connected) {
    await browser.close().catch(() => undefined);
  }
}
