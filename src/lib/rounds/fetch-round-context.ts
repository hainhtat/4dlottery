import type { SupabaseClient } from "@supabase/supabase-js";
import { pickCurrentRoundId, type RoundPick } from "@/lib/rounds/pick-current-round";

/** Enough history for current-round pick without loading every past round. */
export const ROUND_CONTEXT_LIMIT = 30;

export interface RoundContext {
  rounds: RoundPick[];
  currentRoundId: string | null;
  currentRoundName: string | null;
}

export async function fetchRoundContext(supabase: SupabaseClient): Promise<RoundContext> {
  const { data, error } = await supabase
    .from("rounds")
    .select("id, name, status, created_at")
    .order("created_at", { ascending: false })
    .limit(ROUND_CONTEXT_LIMIT);

  if (error) throw error;

  const rounds = (data ?? []) as RoundPick[];
  const currentRoundId = pickCurrentRoundId(rounds);
  const currentRoundName = rounds.find((r) => r.id === currentRoundId)?.name ?? null;

  return { rounds, currentRoundId, currentRoundName };
}
