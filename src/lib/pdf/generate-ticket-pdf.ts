import QRCode from "qrcode";
import {
  acquirePdfBrowser,
  enterPdfRenderSlot,
  leavePdfRenderSlot,
  releasePdfBrowser,
} from "./launch-browser";
import { renderTicketsHtml } from "./render-ticket-html";
import { TICKET_HEIGHT_PX, TICKET_WIDTH_PX } from "./ticket-dimensions";
import type { TicketPdfData } from "./ticket-pdf-data";

export type { TicketPdfData } from "./ticket-pdf-data";

export async function generateTicketPng(ticket: TicketPdfData): Promise<Buffer> {
  const html = renderTicketsHtml([ticket]);
  await enterPdfRenderSlot();
  const browser = await acquirePdfBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({
      width: TICKET_WIDTH_PX,
      height: TICKET_HEIGHT_PX,
      deviceScaleFactor: 2,
    });
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);

    const screenshot = await page.screenshot({
      type: "png",
      fullPage: true,
      omitBackground: false,
    });

    return Buffer.from(screenshot);
  } finally {
    await page.close();
    await releasePdfBrowser(browser);
    leavePdfRenderSlot();
  }
}

export async function generateTicketPdf(tickets: TicketPdfData[]): Promise<Buffer> {
  if (!tickets.length) {
    throw new Error("No tickets to render");
  }

  const html = renderTicketsHtml(tickets);
  await enterPdfRenderSlot();
  const browser = await acquirePdfBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({
      width: TICKET_WIDTH_PX,
      height: TICKET_HEIGHT_PX,
      deviceScaleFactor: 2,
    });
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMediaType("print");

    const pdf = await page.pdf({
      width: `${TICKET_WIDTH_PX}px`,
      height: `${TICKET_HEIGHT_PX}px`,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    return Buffer.from(pdf);
  } finally {
    await page.close();
    await releasePdfBrowser(browser);
    leavePdfRenderSlot();
  }
}

export async function buildQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    margin: 1,
    width: 160,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}

export function buildVerifyUrl(publicId: string, token: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  return `${base}/verify/${publicId}/${token}`;
}
