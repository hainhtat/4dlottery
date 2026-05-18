import type { AgentNotificationPayload, AgentNotificationRow, AgentNotificationType } from "./notification-types";

type TranslateFn = (key: string, params?: Record<string, string>) => string;

function payloadString(payload: AgentNotificationPayload | null, key: keyof AgentNotificationPayload): string {
  const v = payload?.[key];
  return typeof v === "string" ? v : "";
}

export function formatAgentNotification(
  row: AgentNotificationRow,
  t: TranslateFn
): string {
  const roundName = payloadString(row.payload, "round_name");
  const winningNumber = payloadString(row.payload, "winning_number");

  const type = row.type as AgentNotificationType | undefined;

  switch (type) {
    case "round_open":
      return t("agent.notifications.roundOpen", { roundName });
    case "round_closed":
      return t("agent.notifications.roundClosed", { roundName });
    case "round_drawn":
      return t("agent.notifications.roundDrawn", { roundName, winningNumber });
    case "draw_winner":
      return t("agent.notifications.drawWinner", { roundName, winningNumber });
    default:
      break;
  }

  if (row.message?.trim()) {
    return row.message.trim();
  }

  return t("agent.notifications.generic");
}

export function notificationAlertColor(
  type: AgentNotificationType | undefined
): "primary" | "warning" | "success" | "neutral" {
  switch (type) {
    case "round_open":
      return "primary";
    case "round_closed":
      return "warning";
    case "round_drawn":
      return "neutral";
    case "draw_winner":
      return "success";
    default:
      return "neutral";
  }
}
