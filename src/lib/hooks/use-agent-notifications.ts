"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { createClient } from "@/lib/supabase/client";
import { useAgentRefresh } from "@/components/agent/AgentRefreshContext";
import type {
  AgentNotificationPayload,
  AgentNotificationRow,
  AgentNotificationType,
} from "@/lib/agent/notification-types";

const UNREAD_LIMIT = 10;

function normalizeNotification(row: Record<string, unknown>): AgentNotificationRow {
  const payloadRaw = row.payload;
  let payload: AgentNotificationPayload | null = null;
  if (payloadRaw && typeof payloadRaw === "object" && !Array.isArray(payloadRaw)) {
    payload = payloadRaw as AgentNotificationPayload;
  }

  const typeRaw = row.type;
  const type =
    typeRaw === "round_open" ||
    typeRaw === "round_closed" ||
    typeRaw === "round_drawn" ||
    typeRaw === "draw_winner"
      ? (typeRaw as AgentNotificationType)
      : "draw_winner";

  return {
    id: String(row.id),
    type,
    payload,
    message: typeof row.message === "string" ? row.message : null,
  };
}

export function useAgentNotifications() {
  const supabaseRef = useRef(createClient());
  const { refreshKey } = useAgentRefresh();
  const [notifications, setNotifications] = useState<AgentNotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    const supabase = supabaseRef.current;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const full = await supabase
      .from("agent_notifications")
      .select("id, type, payload, message")
      .eq("agent_id", user.id)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(UNREAD_LIMIT);

    const rows =
      !full.error || !full.error.message?.includes("column")
        ? full.data
        : (
            await supabase
              .from("agent_notifications")
              .select("id, message")
              .eq("agent_id", user.id)
              .is("read_at", null)
              .order("created_at", { ascending: false })
              .limit(UNREAD_LIMIT)
          ).data;

    if (full.error && !full.error.message?.includes("column")) {
      setLoading(false);
      return;
    }

    setNotifications((rows ?? []).map((row) => normalizeNotification(row)));
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    void fetchNotifications();
  }, [fetchNotifications, refreshKey]);

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
