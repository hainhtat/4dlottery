import { t } from "@/i18n";
import { getPdfLabels } from "@/i18n/pdf-labels";
import { formatGrandPrize } from "./format-prize";
import { formatTicketSerial } from "./format-ticket-number";
import { getTicketFontFaceCss } from "./embed-fonts";
import { formatTicketSecurityId } from "./pdf-fixed-copy";
import {
  TICKET_HEIGHT_PX,
  TICKET_QR_DISPLAY_PX,
  TICKET_WIDTH_PX,
} from "./ticket-dimensions";
import type { TicketPdfData } from "./ticket-pdf-data";

const METALLIC =
  "linear-gradient(90deg, #BF953F 0%, #FCF6BA 25%, #B38728 50%, #FBF5B7 75%, #AA771C 100%)";
const PAGE_BG = "#050814";

const GUILLOCHE_DATA_URI = `url("data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <path d="M0 50 C25 10 75 10 100 50 S75 90 0 50" fill="none" stroke="white" stroke-width="0.35"/>
  <path d="M0 30 C25 70 75 70 100 30 S75 -10 0 30" fill="none" stroke="white" stroke-width="0.35"/>
  <path d="M0 70 C25 30 75 30 100 70 S75 110 0 70" fill="none" stroke="white" stroke-width="0.35"/>
  <circle cx="50" cy="50" r="38" fill="none" stroke="white" stroke-width="0.25"/>
  <circle cx="50" cy="50" r="22" fill="none" stroke="white" stroke-width="0.2"/>
</svg>
`)}")`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function detailRow(label: string, value: string): string {
  return `
      <span class="detail-label">${escapeHtml(label)}</span>
      <span class="detail-value">${escapeHtml(value)}</span>`;
}

function renderTicketPage(ticket: TicketPdfData, isLast: boolean): string {
  const locale = ticket.locale ?? "my";
  const labels = getPdfLabels(locale);
  const brand = t(locale, "app.brand").toUpperCase();
  const ticketSerial = formatTicketSerial(ticket.number);
  const publicId = ticket.publicId.replace(/\s/g, "").toUpperCase();
  const ticketIdLine = formatTicketSecurityId(ticket.publicId);
  const prizeFormatted = formatGrandPrize(ticket.prizeAmount);
  const priceFormatted = formatGrandPrize(ticket.ticketPrice);

  const detailRows: string[] = [];
  if (ticket.holderName) detailRows.push(detailRow(labels.holder, ticket.holderName));
  if (ticket.contact) detailRows.push(detailRow(labels.contact, ticket.contact));
  detailRows.push(detailRow(labels.agent, ticket.agentName));
  detailRows.push(detailRow(labels.drawDate, ticket.drawDate));
  detailRows.push(detailRow(labels.issued, ticket.issuedAt));

  const pageBreakClass = isLast ? "ticket-page ticket-page--last" : "ticket-page";

  return `
    <section class="${pageBreakClass}">
      <div class="ticket-frame">
        <div class="ticket-inner">
          <div class="guilloche" aria-hidden="true"></div>
          <header class="ticket-header">
            <h1 class="brand-title">${escapeHtml(brand)}</h1>
            <p class="official-line">
              <span class="official-part">${escapeHtml(labels.officialTicket)}</span>
              <span class="official-sep"> – </span>
              <span class="official-id">${escapeHtml(publicId)}</span>
            </p>
            <p class="round-name">${escapeHtml(ticket.roundName)}</p>
            <p class="header-ticket-price">
              <span class="header-price-label">${escapeHtml(labels.ticketPrice)}:</span>
              <span class="header-price-value">${escapeHtml(priceFormatted)}</span>
              <span class="header-price-unit"> MMK</span>
            </p>
          </header>
          <div class="box prize-box">
            <p class="box-label-gold foil-label">${escapeHtml(labels.grandPrize)}</p>
            <p class="prize-amount">${escapeHtml(prizeFormatted)}</p>
            <p class="prize-context">${escapeHtml(labels.prizeSub)}</p>
          </div>
          <div class="box number-box">
            <p class="ticket-number">${escapeHtml(ticketSerial)}</p>
          </div>
          <div class="details-grid">${detailRows.join("")}</div>
          <footer class="ticket-footer">
            <div class="qr-frame metallic-border-box">
              <img src="${ticket.qrDataUrl}" alt="QR" width="${TICKET_QR_DISPLAY_PX}" height="${TICKET_QR_DISPLAY_PX}" />
            </div>
            <p class="verify-hint">${escapeHtml(labels.scanVerify)}</p>
            <p class="footer-id">${escapeHtml(ticketIdLine)}</p>
            <p class="security-footer">${escapeHtml(labels.footer)}</p>
          </footer>
        </div>
      </div>
    </section>`;
}

const TICKET_CSS = `
  :root {
    --ticket-w: ${TICKET_WIDTH_PX}px;
    --ticket-h: ${TICKET_HEIGHT_PX}px;
    --page-bg: ${PAGE_BG};
    --metallic: ${METALLIC};
    --label-muted: rgba(212, 175, 55, 0.88);
    --silver-label: rgba(168, 176, 196, 0.85);
    --cream-dim: rgba(168, 176, 196, 0.72);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page {
    size: ${TICKET_WIDTH_PX}px ${TICKET_HEIGHT_PX}px;
    margin: 0;
  }
  html {
    margin: 0;
    padding: 0;
    background: var(--page-bg);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body {
    margin: 0;
    padding: 0;
    background: var(--page-bg);
  }
  @media print {
    html, body {
      width: var(--ticket-w);
      overflow: hidden;
    }
  }
  @media screen {
    html, body {
      width: 100%;
      max-width: 100%;
      min-height: 100%;
      overflow-x: hidden;
    }
    .ticket-viewport {
      width: 100%;
      padding: 12px;
      box-sizing: border-box;
    }
    .ticket-scaler {
      width: 100%;
      max-width: var(--ticket-w);
      margin: 0 auto;
      overflow: hidden;
    }
    .ticket-scaler-inner {
      width: var(--ticket-w);
      transform-origin: top left;
    }
    .ticket-page + .ticket-page {
      margin-top: 16px;
    }
  }
  @media print {
    .ticket-viewport { padding: 0; width: var(--ticket-w); }
    .ticket-scaler,
    .ticket-scaler-inner {
      width: var(--ticket-w) !important;
      height: auto !important;
      transform: none !important;
      margin: 0;
      padding: 0;
      overflow: visible;
    }
    .ticket-page + .ticket-page { margin-top: 0; }
  }
  .ticket-page {
    width: var(--ticket-w);
    height: var(--ticket-h);
    max-height: var(--ticket-h);
    overflow: hidden;
    page-break-inside: avoid;
    break-inside: avoid;
    page-break-after: always;
    break-after: page;
    background: var(--page-bg);
    font-family: 'Padauk', 'Geist Sans', sans-serif;
    font-feature-settings: 'liga' 1, 'clig' 1;
  }
  .ticket-page--last,
  .ticket-page:last-child {
    page-break-after: avoid !important;
    break-after: avoid !important;
  }
  .ticket-frame,
  .ticket-inner {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .ticket-frame {
    width: 100%;
    height: var(--ticket-h);
    padding: 4px;
    background: var(--metallic);
  }
  .ticket-inner {
    position: relative;
    width: 100%;
    height: 100%;
    padding: 24px 24px 22px;
    background: linear-gradient(135deg, #0B1325 0%, #050814 100%);
    border: 2px solid rgba(191, 149, 63, 0.45);
    outline: 1px solid rgba(191, 149, 63, 0.25);
    outline-offset: -5px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    overflow: hidden;
  }
  .guilloche {
    position: absolute;
    inset: 0;
    background-image: ${GUILLOCHE_DATA_URI};
    background-size: 100px 100px;
    opacity: 0.045;
    pointer-events: none;
    z-index: 0;
  }
  .ticket-header,
  .box,
  .details-grid,
  .ticket-footer {
    position: relative;
    z-index: 2;
  }
  .ticket-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    width: 100%;
    margin-bottom: 16px;
    flex-shrink: 0;
  }
  .brand-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    line-height: 1.3;
    white-space: nowrap;
    width: 100%;
    color: #f0e4b8;
    margin-bottom: 10px;
  }
  .official-line {
    font-family: 'Padauk', sans-serif;
    font-size: 11px;
    font-weight: 500;
    line-height: 1.45;
    max-width: 100%;
    margin-bottom: 8px;
    color: rgba(255, 255, 255, 0.92);
  }
  .official-id {
    font-family: 'Geist Sans', sans-serif;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: #d4af37;
  }
  .round-name {
    font-family: 'Geist Sans', 'Padauk', sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: 0.04em;
    margin-bottom: 8px;
    max-width: 100%;
    word-break: break-word;
  }
  .header-ticket-price {
    font-family: 'Geist Sans', 'Padauk', sans-serif;
    font-size: 10px;
    line-height: 1.35;
    color: rgba(212, 175, 55, 0.95);
  }
  .header-price-label {
    font-weight: 600;
    letter-spacing: 0.04em;
  }
  .header-price-value {
    font-weight: 700;
    color: #ffffff;
    margin: 0 2px;
  }
  .header-price-unit {
    font-size: 9px;
    font-weight: 600;
    opacity: 0.9;
  }
  .foil-label {
    color: #e8d48b;
    font-weight: 700;
  }
  .metallic-border-box {
    padding: 1px;
    background: var(--metallic);
  }
  .box {
    width: 100%;
    flex-shrink: 0;
  }
  .prize-box,
  .number-box {
    background: none;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .prize-box {
    border: 1px solid rgba(191, 149, 63, 0.65);
    padding: 14px 12px 12px;
    margin-bottom: 14px;
  }
  .number-box {
    border: 1px solid rgba(168, 176, 196, 0.5);
    padding: 14px 12px 12px;
    margin-bottom: 14px;
  }
  .box-label-gold {
    font-family: 'Geist Sans', 'Padauk', sans-serif;
    font-size: 9px;
    letter-spacing: 0.22em;
    margin-bottom: 8px;
    text-transform: uppercase;
  }
  .prize-amount {
    font-family: 'Geist Sans', sans-serif;
    font-size: 30px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: 0.02em;
    line-height: 1;
    margin-bottom: 8px;
  }
  .prize-context {
    font-family: 'Padauk', 'Geist Sans', sans-serif;
    font-size: 8px;
    font-weight: 500;
    color: var(--cream-dim);
    line-height: 1.35;
    max-width: 92%;
  }
  .ticket-number {
    font-family: 'Geist Sans', sans-serif;
    font-size: 34px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: 6px;
    line-height: 1;
    margin-right: -6px;
  }
  .details-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: 14px;
    row-gap: 9px;
    width: 100%;
    margin-bottom: 0;
    flex-shrink: 0;
  }
  .detail-label {
    font-family: 'Padauk', sans-serif;
    font-size: 9px;
    font-weight: 500;
    color: var(--label-muted);
    line-height: 1.4;
    text-align: left;
    white-space: nowrap;
  }
  .detail-value {
    font-family: 'Geist Sans', 'Padauk', sans-serif;
    font-size: 9px;
    font-weight: 500;
    color: #ffffff;
    line-height: 1.4;
    text-align: left;
    word-break: break-word;
  }
  .ticket-footer {
    margin-top: 22px;
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
  }
  .qr-frame {
    padding: 1px;
    background: var(--metallic);
    margin-bottom: 10px;
    flex-shrink: 0;
  }
  .qr-frame img {
    display: block;
    width: ${TICKET_QR_DISPLAY_PX}px;
    height: ${TICKET_QR_DISPLAY_PX}px;
    background: #ffffff;
    padding: 4px;
  }
  .verify-hint {
    font-family: 'Padauk', sans-serif;
    font-size: 8px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.88);
    text-align: center;
    line-height: 1.3;
    margin-bottom: 6px;
    max-width: 100%;
  }
  .footer-id {
    font-family: 'Geist Sans', sans-serif;
    font-size: 7px;
    font-weight: 600;
    color: rgba(168, 176, 196, 0.65);
    letter-spacing: 0.08em;
    text-align: center;
    margin-bottom: 6px;
  }
  .security-footer {
    font-family: 'Padauk', 'Geist Sans', sans-serif;
    font-size: 7px;
    font-weight: 500;
    line-height: 1.5;
    color: rgba(168, 176, 196, 0.72);
    text-align: center;
    max-width: 100%;
    padding: 0 4px 2px;
    margin-top: 2px;
  }
  @media screen and (max-width: 480px) {
    .brand-title {
      font-size: clamp(10px, 3vw, 13px);
      letter-spacing: 0.16em;
    }
    .official-line { font-size: clamp(9px, 2.8vw, 11px); }
    .round-name { font-size: clamp(11px, 3.4vw, 13px); }
    .prize-amount { font-size: clamp(22px, 7vw, 30px); }
    .ticket-number { font-size: clamp(26px, 8vw, 34px); }
  }
`;

const TICKET_VIEWPORT_SCRIPT = `
(function () {
  var TICKET_W = ${TICKET_WIDTH_PX};
  var TICKET_H = ${TICKET_HEIGHT_PX};
  var PAD = 24;
  var PAGE_GAP = 16;
  if (typeof window === "undefined" || navigator.webdriver) return;
  function layout() {
    if (window.matchMedia("print").matches) return;
    var inner = document.querySelector(".ticket-scaler-inner");
    var scaler = document.querySelector(".ticket-scaler");
    if (!inner || !scaler) return;
    var pages = inner.querySelectorAll(".ticket-page");
    var count = pages.length || 1;
    var avail = Math.max(0, Math.min(window.innerWidth, document.documentElement.clientWidth) - PAD);
    if (avail >= TICKET_W) {
      inner.style.transform = "";
      scaler.style.height = "";
      return;
    }
    var scale = avail / TICKET_W;
    var tx = Math.max(0, (avail - TICKET_W * scale) / 2);
    inner.style.transform = "translate(" + tx + "px, 0) scale(" + scale + ")";
    inner.style.transformOrigin = "top left";
    scaler.style.height = (TICKET_H * count + PAGE_GAP * Math.max(0, count - 1)) * scale + "px";
  }
  window.addEventListener("resize", layout);
  window.addEventListener("beforeprint", function () {
    var inner = document.querySelector(".ticket-scaler-inner");
    var scaler = document.querySelector(".ticket-scaler");
    if (inner) inner.style.transform = "";
    if (scaler) scaler.style.height = "";
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", layout);
  } else {
    layout();
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
})();
`;

export function renderTicketsHtml(tickets: TicketPdfData[]): string {
  const fontCss = getTicketFontFaceCss();
  const lastIndex = tickets.length - 1;
  const pages = tickets
    .map((ticket, i) => renderTicketPage(ticket, i === lastIndex))
    .join("\n");

  return `<!DOCTYPE html>
<html lang="my">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>${fontCss}</style>
  <style>${TICKET_CSS}</style>
</head>
<body>
  <div class="ticket-viewport">
    <div class="ticket-scaler">
      <div class="ticket-scaler-inner">
        ${pages}
      </div>
    </div>
  </div>
  <script>${TICKET_VIEWPORT_SCRIPT}</script>
</body>
</html>`;
}
