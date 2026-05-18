"use client";

import Alert from "@mui/joy/Alert";
import IconButton from "@mui/joy/IconButton";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useT } from "@/components/providers/LocaleProvider";

export interface AgentNotification {
  id: string;
  message: string;
}

export function AgentNotificationAlerts({
  notifications,
  onDismiss,
  dismissingId,
}: {
  notifications: AgentNotification[];
  onDismiss: (id: string) => void;
  dismissingId?: string | null;
}) {
  const t = useT();

  if (notifications.length === 0) return null;

  return (
    <>
      {notifications.map((n) => (
        <Alert
          key={n.id}
          color="success"
          variant="soft"
          sx={{ mb: 2, alignItems: "flex-start" }}
          endDecorator={
            <IconButton
              variant="plain"
              size="sm"
              color="neutral"
              disabled={dismissingId === n.id}
              onClick={() => onDismiss(n.id)}
              aria-label={t("agent.sell.dismissNotification")}
              sx={{ mt: -0.25, mr: -0.5 }}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          }
        >
          {n.message}
        </Alert>
      ))}
    </>
  );
}
