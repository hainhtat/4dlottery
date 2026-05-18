"use client";

import { useEffect, useState } from "react";
import Alert from "@mui/joy/Alert";
import Button from "@mui/joy/Button";
import Typography from "@mui/joy/Typography";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import IconButton from "@mui/joy/IconButton";
import { useT } from "@/components/providers/LocaleProvider";

const DISMISS_KEY = "agent-pwa-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function AgentInstallPrompt() {
  const t = useT();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    setDismissed(false);

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (dismissed || (!deferred && typeof window !== "undefined" && !isIosSafari())) {
    return null;
  }

  async function handleInstall() {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      setDismissed(true);
      return;
    }
  }

  function handleDismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <Alert
      color="primary"
      variant="soft"
      sx={{ mb: 2 }}
      endDecorator={
        <IconButton size="sm" variant="plain" onClick={handleDismiss} aria-label="Close">
          <CloseRoundedIcon />
        </IconButton>
      }
    >
      <Typography level="body-sm" sx={{ mb: 1 }}>
        {deferred ? t("agent.pwa.installPrompt") : t("agent.pwa.iosHint")}
      </Typography>
      {deferred && (
        <Button size="sm" variant="solid" onClick={() => void handleInstall()}>
          {t("agent.pwa.installButton")}
        </Button>
      )}
    </Alert>
  );
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua) && /Safari/i.test(ua) && !/CriOS|FxiOS/i.test(ua);
}
