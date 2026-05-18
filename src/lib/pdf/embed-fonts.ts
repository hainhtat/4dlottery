import { readFileSync } from "node:fs";
import path from "node:path";

let cachedCss: string | null = null;

function fontDataUrl(filename: string, mime: string): string {
  const filePath = path.join(process.cwd(), "public", "fonts", filename);
  const base64 = readFileSync(filePath).toString("base64");
  return `data:${mime};base64,${base64}`;
}

/** Padauk (Myanmar), Geist (UI Latin), Playfair Display (luxury serif). */
export function getTicketFontFaceCss(): string {
  if (cachedCss) return cachedCss;

  const padaukRegular = fontDataUrl("Padauk-Regular.woff", "font/woff");
  const padaukBold = fontDataUrl("Padauk-Bold.woff", "font/woff");
  const geistRegular = fontDataUrl("GeistSans-Regular.woff", "font/woff");
  const geistBold = fontDataUrl("GeistSans-SemiBold.woff", "font/woff");
  const playfairRegular = fontDataUrl("PlayfairDisplay-Regular.woff2", "font/woff2");
  const playfairBold = fontDataUrl("PlayfairDisplay-Bold.woff2", "font/woff2");

  cachedCss = `
@font-face {
  font-family: 'Padauk';
  src: url('${padaukRegular}') format('woff');
  font-weight: 400;
  font-style: normal;
  font-display: block;
}
@font-face {
  font-family: 'Padauk';
  src: url('${padaukBold}') format('woff');
  font-weight: 700;
  font-style: normal;
  font-display: block;
}
@font-face {
  font-family: 'Geist Sans';
  src: url('${geistRegular}') format('woff');
  font-weight: 400;
  font-style: normal;
  font-display: block;
}
@font-face {
  font-family: 'Geist Sans';
  src: url('${geistBold}') format('woff');
  font-weight: 600;
  font-style: normal;
  font-display: block;
}
@font-face {
  font-family: 'Playfair Display';
  src: url('${playfairRegular}') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: block;
}
@font-face {
  font-family: 'Playfair Display';
  src: url('${playfairBold}') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: block;
}
`.trim();

  return cachedCss;
}
