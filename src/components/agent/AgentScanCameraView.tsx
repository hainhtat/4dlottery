"use client";

import { useState } from "react";
import Box from "@mui/joy/Box";
import Typography from "@mui/joy/Typography";
import Button from "@mui/joy/Button";
import Input from "@mui/joy/Input";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Alert from "@mui/joy/Alert";
import Stack from "@mui/joy/Stack";
import { AgentQrScanner } from "@/components/agent/AgentQrScanner";
import { useT } from "@/components/providers/LocaleProvider";

const VIEWFINDER_CORNER = {
  position: "absolute" as const,
  width: 28,
  height: 28,
  borderColor: "rgba(255, 255, 255, 0.92)",
  pointerEvents: "none" as const,
};

function ViewfinderOverlay() {
  return (
    <Box
      aria-hidden
      sx={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <Box
        sx={{
          width: "min(78vw, 78vh)",
          aspectRatio: "1",
          position: "relative",
          boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.45)",
          borderRadius: 2,
        }}
      >
        <Box sx={{ ...VIEWFINDER_CORNER, top: 0, left: 0, borderTop: 3, borderLeft: 3, borderRadius: "6px 0 0 0" }} />
        <Box sx={{ ...VIEWFINDER_CORNER, top: 0, right: 0, borderTop: 3, borderRight: 3, borderRadius: "0 6px 0 0" }} />
        <Box sx={{ ...VIEWFINDER_CORNER, bottom: 0, left: 0, borderBottom: 3, borderLeft: 3, borderRadius: "0 0 0 6px" }} />
        <Box sx={{ ...VIEWFINDER_CORNER, bottom: 0, right: 0, borderBottom: 3, borderRight: 3, borderRadius: "0 0 6px 0" }} />
      </Box>
    </Box>
  );
}

export function AgentScanCameraView({
  active,
  cameraError,
  onScan,
  onError,
  manualUrl,
  onManualUrlChange,
  onManualVerify,
}: {
  active: boolean;
  cameraError: string | null;
  onScan: (text: string) => void;
  onError: (message: string) => void;
  manualUrl: string;
  onManualUrlChange: (value: string) => void;
  onManualVerify: () => void;
}) {
  const t = useT();
  const [manualOpen, setManualOpen] = useState(false);

  return (
    <Box
      className="agent-scan-camera"
      sx={{
        position: { xs: "fixed", sm: "relative" },
        zIndex: { xs: 1090, sm: "auto" },
        top: { xs: "calc(52px + var(--safe-top))", sm: "auto" },
        left: { xs: 0, sm: "auto" },
        right: { xs: 0, sm: "auto" },
        bottom: {
          xs: "calc(var(--agent-tab-bar-reserve, 143px) + var(--safe-bottom))",
          sm: "auto",
        },
        display: "flex",
        flexDirection: "column",
        bgcolor: { xs: "#0f172a", sm: "transparent" },
        mx: { sm: "auto" },
        width: { sm: "100%" },
        maxWidth: { sm: 480 },
        borderRadius: { sm: 12 },
        overflow: "hidden",
      }}
    >
      <Box
        className="agent-qr-scanner--fullscreen"
        sx={{
          position: "relative",
          flex: 1,
          minHeight: { xs: 0, sm: 320 },
          overflow: "hidden",
        }}
      >
        <AgentQrScanner
          active={active}
          variant="fullscreen"
          onScan={onScan}
          onError={onError}
        />
        <ViewfinderOverlay />
      </Box>

      <Stack
        spacing={1.25}
        sx={{
          flexShrink: 0,
          px: 2,
          py: 1.5,
          bgcolor: { xs: "rgba(15, 23, 42, 0.96)", sm: "background.surface" },
          borderTop: { sm: "1px solid" },
          borderColor: { sm: "divider" },
        }}
      >
        {cameraError && (
          <Alert color="warning" variant="soft" size="sm">
            {cameraError}
          </Alert>
        )}
        <Typography
          level="body-sm"
          sx={{
            color: { xs: "rgba(248, 250, 252, 0.88)", sm: "text.secondary" },
            textAlign: "center",
          }}
        >
          {t("agent.scan.holdSteady")}
        </Typography>

        <Button
          variant="plain"
          color="neutral"
          size="sm"
          onClick={() => setManualOpen((open) => !open)}
          sx={{
            alignSelf: "center",
            color: { xs: "rgba(248, 250, 252, 0.72)", sm: "text.tertiary" },
          }}
        >
          {manualOpen ? t("agent.scan.hideManual") : t("agent.scan.showManual")}
        </Button>

        {manualOpen && (
          <Stack spacing={1}>
            <FormControl>
              <FormLabel sx={{ color: { xs: "neutral.300", sm: undefined } }}>
                {t("agent.scan.manualLabel")}
              </FormLabel>
              <Input
                value={manualUrl}
                onChange={(e) => onManualUrlChange(e.target.value)}
                placeholder={t("agent.scan.manualPlaceholder")}
                slotProps={{ input: { sx: { fontSize: "0.85rem" } } }}
              />
            </FormControl>
            <Button
              variant="soft"
              onClick={onManualVerify}
              disabled={!manualUrl.trim()}
            >
              {t("agent.scan.manualSubmit")}
            </Button>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
