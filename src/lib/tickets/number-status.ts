export type NumberCheckStatus =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "invalid"
  | "duplicate";

export interface NumberCheckResult {
  available: boolean;
  reason?: string;
  number?: string;
}

export async function checkNumberAvailable(
  roundId: string,
  number: string
): Promise<NumberCheckResult> {
  const digits = number.replace(/\D/g, "");
  if (digits.length === 0) {
    return { available: false, reason: "empty" };
  }
  if (digits.length < 4) {
    return { available: false, reason: "incomplete" };
  }

  const res = await fetch(
    `/api/tickets/check-number?roundId=${encodeURIComponent(roundId)}&number=${encodeURIComponent(digits)}`,
    { credentials: "include" }
  );

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? "Could not check number");
  }

  return res.json() as Promise<NumberCheckResult>;
}
