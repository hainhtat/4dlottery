"use client";

import { useAgentLiveSync } from "@/lib/hooks/use-agent-live-sync";

/** Invisible subscriber — must render inside AgentRefreshProvider. */
export function AgentLiveSync() {
  useAgentLiveSync();
  return null;
}
