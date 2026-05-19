export type AgentNotificationType =
  | "round_open"
  | "round_closed"
  | "round_drawn"
  | "draw_winner"
  | "legacy";

export interface AgentNotificationPayload {
  round_name?: string;
  winning_number?: string;
}

export interface AgentNotificationRow {
  id: string;
  roundId: string | null;
  type: AgentNotificationType;
  payload: AgentNotificationPayload | null;
  message: string | null;
}
