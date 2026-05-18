export interface RoundPick {
  id: string;
  name?: string;
  status: string;
  created_at?: string;
}

/** Same priority as settlement RPC: open → closed → latest. */
export function pickCurrentRoundId(rounds: RoundPick[]): string | null {
  if (!rounds.length) return null;

  const open = rounds.find((r) => r.status === "open");
  if (open) return open.id;

  const byCreated = (a: RoundPick, b: RoundPick) =>
    new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();

  const closed = rounds.filter((r) => r.status === "closed").sort(byCreated);
  if (closed[0]) return closed[0].id;

  const sorted = [...rounds].sort(byCreated);
  return sorted[0]?.id ?? null;
}
