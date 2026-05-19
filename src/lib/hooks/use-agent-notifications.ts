"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "react-toastify";
import { createClient } from "@/lib/supabase/client";
import {
  filterRelevantNotifications,
  type RoundForNotificationFilter,
} from "@/lib/agent/filter-relevant-notifications";
import type {
  AgentNotificationPayload,
  AgentNotificationRow,
  AgentNotificationType,
} from "@/lib/agent/notification-types";

const UNREAD_LIMIT = 10;
const REFETCH_DEBOUNCE_MS = 400;

function parseNotificationType(raw: unknown): AgentNotificationType {
  if (
    raw === "round_open" ||
    raw === "round_closed" ||
    raw === "round_drawn" ||
    raw === "draw_winner"
  ) {
    return raw;
  }
  return "legacy";
}

function normalizeNotification(row: Record<string, unknown>): AgentNotificationRow {
  const payloadRaw = row.payload;
  let payload: AgentNotificationPayload | null = null;
  if (payloadRaw && typeof payloadRaw === "object" && !Array.isArray(payloadRaw)) {
    payload = payloadRaw as AgentNotificationPayload;
  }

  const roundIdRaw = row.round_id;
  const roundId =
    typeof roundIdRaw === "string" && roundIdRaw.length > 0 ? roundIdRaw : null;

  return {
    id: String(row.id),
    roundId,
    type: parseNotificationType(row.type),
    payload,
    message: typeof row.message === "string" ? row.message : null,
  };
}

async function fetchUnreadNotifications(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<AgentNotificationRow[]> {
  const full = await supabase
    .from("agent_notifications")
    .select("id, round_id, type, payload, message")
    .eq("agent_id", userId)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(UNREAD_LIMIT);

  const rows =
    !full.error || !full.error.message?.includes("column")
      ? full.data
      : (
          await supabase
            .from("agent_notifications")
            .select("id, round_id, message")
            .eq("agent_id", userId)
            .is("read_at", null)
            .order("created_at", { ascending: false })
            .limit(UNREAD_LIMIT)
        ).data;

  if (full.error && !full.error.message?.includes("column")) {
    throw full.error;
  }

  return (rows ?? []).map((row) => normalizeNotification(row));
}

async function fetchRoundsForFilter(
  supabase: ReturnType<typeof createClient>
): Promise<RoundForNotificationFilter[]> {
  const { data, error } = await supabase
    .from("rounds")
    .select("id, status, created_at")
    .in("status", ["open", "closed", "drawn"])
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    return [];
  }

  return (data ?? []) as RoundForNotificationFilter[];
}

export function useAgentNotifications() {
  const supabaseRef = useRef(createClient());
  const [notifications, setNotifications] = useState<AgentNotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const initialLoadDoneRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadNotifications = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? initialLoadDoneRef.current;
    if (!silent) {
      setLoading(true);
    }

    const supabase = supabaseRef.current;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setNotifications([]);
      setLoading(false);
      initialLoadDoneRef.current = true;
      return;
    }

    try {
      const [rows, rounds] = await Promise.all([
        fetchUnreadNotifications(supabase, user.id),
        fetchRoundsForFilter(supabase),
      ]);
      setNotifications(filterRelevantNotifications(rows, rounds));
    } catch {
      // Keep last known banners on transient errors.
    } finally {
      setLoading(false);
      initialLoadDoneRef.current = true;
    }
  }, []);

  const scheduleReload = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void loadNotifications({ silent: true });
    }, REFETCH_DEBOUNCE_MS);
  }, [loadNotifications]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const supabase = supabaseRef.current;
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;

      channel = supabase
        .channel(`agent-notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "agent_notifications",
            filter: `agent_id=eq.${user.id}`,
          },
          () => scheduleReload()
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "rounds" },
          () => scheduleReload()
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [scheduleReload]);

  const dismissNotification = useCallback(async (id: string) => {
    const supabase = supabaseRef.current;
    setDismissingId(id);
    const { error } = await supabase
      .from("agent_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);

    setDismissingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return {
    notifications,
    loading,
    dismissingId,
    dismissNotification,
  };
}
