"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useAgentRefresh } from "@/components/agent/AgentRefreshContext";

/** Poll interval when Realtime is unavailable or slow (e.g. local dev). */
const FALLBACK_POLL_MS = 25_000;

/**
 * Keeps agent UI in sync when admin changes rounds (close/draw/open) without a full page reload.
 */
export function useAgentLiveSync() {
  const { notifyAgentDataChanged } = useAgentRefresh();
  const notifyRef = useRef(notifyAgentDataChanged);
  notifyRef.current = notifyAgentDataChanged;
  const channelGenRef = useRef(0);

  useEffect(() => {
    const supabase = createClient();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    const channelGen = ++channelGenRef.current;

    const bump = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        notifyRef.current();
      }, 350);
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        bump();
      }
    };

    document.addEventListener("visibilitychange", onVisible);

    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        bump();
      }
    }, FALLBACK_POLL_MS);

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled || channelGen !== channelGenRef.current || !user) {
        return;
      }

      const topic = `agent-sync-${user.id}-${channelGen}`;

      channel = supabase.channel(topic);
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rounds" },
        () => bump()
      );
      channel.subscribe();
    })();

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(poll);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, []);
}
