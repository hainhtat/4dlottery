"use client";

import { useEffect, useState } from "react";
import Alert from "@mui/joy/Alert";
import Button from "@mui/joy/Button";
import Typography from "@mui/joy/Typography";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import IconButton from "@mui/joy/IconButton";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/providers/LocaleProvider";
import {
  AgentInstallPromptGuide,
  type InstallGuideVariant,
} from "@/components/agent/AgentInstallPromptGuide";

/** Per browser tab session only — not persisted across logins or new visits. */
const DISMISS_KEY = "agent-pwa-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type PromptMode = "native" | InstallGuideVariant;

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function isDismissedThisSession(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function setDismissedThisSession(): void {
  try {
    sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* private mode */
  }
}

function clearDismissedSession(): void {
  try {
    sessionStorage.removeItem(DISMISS_KEY);
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(DISMISS_KEY);
  } catch {
    /* ignore — legacy permanent dismiss */
  }
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua) && /Safari/i.test(ua) && !/CriOS|FxiOS/i.test(ua);
}

function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

function resolveMode(deferred: BeforeInstallPromptEvent | null): PromptMode {
  if (deferred) return "native";
  if (isIosSafari()) return "ios";
  if (isAndroid()) return "android";
  return "desktop";
}

function shouldShowInstallPrompt(): boolean {
  if (isStandalone()) return false;
  return !isDismissedThisSession();
}

export function AgentInstallPrompt() {
  const t = useT();
  const [mounted, setMounted] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    setMounted(true);
    localStorage.removeItem(DISMISS_KEY);

    if (!shouldShowInstallPrompt()) return;

    setHidden(false);

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" && !isStandalone()) {
        clearDismissedSession();
        setHidden(false);
      }
      if (event === "SIGNED_OUT") {
        clearDismissedSession();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!mounted || hidden || isStandalone()) return null;

  const mode = resolveMode(deferred);
  const isNative = mode === "native";

  async function handleInstall() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    handleDismiss();
  }

  function handleDismiss() {
    setDismissedThisSession();
    setHidden(true);
  }

  return (
    <Alert
      color="primary"
      variant="soft"
      sx={{ mb: 2 }}
      endDecorator={
        <IconButton
          size="sm"
          variant="plain"
          onClick={handleDismiss}
          aria-label={t("agent.pwa.dismiss")}
        >
          <CloseRoundedIcon />
        </IconButton>
      }
    >
      {isNative ? (
        <>
          <Typography level="body-sm" sx={{ mb: 1 }}>
            {t("agent.pwa.intro")}
          </Typography>
          <Button size="sm" variant="solid" onClick={() => void handleInstall()}>
            {t("agent.pwa.installButton")}
          </Button>
        </>
      ) : (
        <AgentInstallPromptGuide variant={mode} />
      )}
    </Alert>
  );
}
