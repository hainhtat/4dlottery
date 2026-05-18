import type { Locale } from "@/i18n";

const PDF_DATETIME_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
};

function localeTag(locale?: Locale): string {
  return locale === "my" ? "my-MM" : "en-GB";
}

export function formatPdfDateTime(iso: string, locale?: Locale): string {
  return new Date(iso).toLocaleString(localeTag(locale), PDF_DATETIME_OPTIONS);
}

/** Printable tickets always show dates in English regardless of UI locale. */
export function formatPdfDateTimeEnglish(iso: string): string {
  return formatPdfDateTime(iso, "en");
}

/** UI display dates (same rules as PDF). */
export function formatDisplayDateTime(iso: string, locale?: Locale): string {
  return formatPdfDateTime(iso, locale);
}
