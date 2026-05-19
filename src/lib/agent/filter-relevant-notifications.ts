import { pickCurrentRoundId } from "@/lib/rounds/pick-current-round";
import type { AgentNotificationRow } from "@/lib/agent/notification-types";

export interface RoundForNotificationFilter {
  id: string;
  status: string;
  created_at?: string;
}

/**
 * Which round(s) lifecycle notifications belong to right now.
 * - Open round(s): active selling window — only their notifications matter.
 * - No open round: the current transition round (latest closed/drawn).
 */
export function getRelevantRoundIds(rounds: RoundForNotificationFilter[]): Set<string> {
  const openIds = rounds.filter((r) => r.status === "open").map((r) => r.id);
  if (openIds.length > 0) {
    return new Set(openIds);
  }

  const focusId = pickCurrentRoundId(rounds);
  return focusId ? new Set([focusId]) : new Set();
}

export function filterRelevantNotifications(
  notifications: AgentNotificationRow[],
  rounds: RoundForNotificationFilter[]
): AgentNotificationRow[] {
  const relevant = getRelevantRoundIds(rounds);
  if (relevant.size === 0) {
    return notifications.filter((n) => !n.roundId);
  }

  return notifications.filter((n) => !n.roundId || relevant.has(n.roundId));
}
