"use client";

import { AgentNotificationAlerts } from "@/components/agent/AgentNotificationAlerts";
import { useAgentNotifications } from "@/lib/hooks/use-agent-notifications";

/** Unread agent notifications — shown on all agent pages via the portal shell. */
export function AgentNotificationBanner() {
  const { notifications, loading, dismissingId, dismissNotification } = useAgentNotifications();

  if (loading || notifications.length === 0) {
    return null;
  }

  return (
    <AgentNotificationAlerts
      notifications={notifications}
      onDismiss={dismissNotification}
      dismissingId={dismissingId}
    />
  );
}
