/** Max tickets per sale / PDF batch (must match DB `issue_tickets` guard). */
export const MAX_TICKETS_PER_BATCH = 20;

export function assertBatchTicketCount(count: number): void {
  if (!Number.isFinite(count) || count < 1) {
    throw new Error("At least one ticket is required");
  }
  if (count > MAX_TICKETS_PER_BATCH) {
    throw new Error(`Maximum ${MAX_TICKETS_PER_BATCH} tickets per batch`);
  }
}
