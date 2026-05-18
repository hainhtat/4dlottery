/** Raw 4-digit ticket number (e.g. 0345, 1234) — no symbol prefix. */
export function formatTicketSerial(number: string): string {
  const digits = number.replace(/\D/g, "").slice(-4);
  if (!digits) return "0000";
  return digits.padStart(4, "0");
}
