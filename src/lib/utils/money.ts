/** Parse user input with optional thousands separators. */
export function parseMoneyInput(value: string): number {
  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Format for display / inputs (no decimals unless needed). */
export function formatMoneyInput(value: string | number): string {
  if (value === "" || value === null || value === undefined) return "";
  const n = typeof value === "number" ? value : parseMoneyInput(value);
  if (!Number.isFinite(n) || n === 0) {
    if (typeof value === "string" && value.replace(/,/g, "").trim() === "") return "";
    if (n === 0 && (typeof value === "number" || value.replace(/,/g, "").trim() === "0")) return "0";
  }
  if (!Number.isFinite(n)) return "";
  return Math.round(n).toLocaleString("en-US");
}

export function formatMoneyDisplay(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

/** Suggested grand prize leaving admin margin if all slots sold (default 10k numbers). */
export function suggestPrizeAmount(
  ticketPrice: number,
  marginPercent: number,
  capacity = 10_000
): number {
  const pool = ticketPrice * capacity;
  return Math.round(pool * (1 - marginPercent / 100));
}
