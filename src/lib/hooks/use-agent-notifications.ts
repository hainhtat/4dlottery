"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { createClient } from "@/lib/supabase/client";
import { useAgentRefresh } from "@/components/agent/AgentRefreshContext";
import type { AgentNotificationRow } from "@/lib/agent/notification-types";

const UNREAD_LIMIT = 10;

export function useAgentNotifications() {
  const supabase = createClient();
  const { refreshKey } = useAgentRefresh();
  const [notifications, setNotifications] = useState<AgentNotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("agent_notifications")
      .select("id, type, payload, message")
      .eq("agent_id", user.id)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(UNREAD_LIMIT);

    if (error) {
      setLoading(false);
      return;
    }

    setNotifications((data ?? []) as AgentNotificationRow[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    setLoading(true);
    void fetchNotifications();
  }, [fetchNotifications, refreshKey]);

  const dismissNotification = useCallback(
    async (id: string) => {
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
    },
    [supabase]
  );

  return {
    notifications,
    loading,
    dismissingId,
    dismissNotification,
  };
}
