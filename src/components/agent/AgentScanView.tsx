"use client";

import { useCallback, useState } from "react";
import Box from "@mui/joy/Box";
import Typography from "@mui/joy/Typography";
import Card from "@mui/joy/Card";
import Button from "@mui/joy/Button";
import Stack from "@mui/joy/Stack";
import { AGENT_SCAN_NAV_ITEM } from "@/components/agent/agentNav";
import { toast } from "react-toastify";
import { AgentScanCameraView } from "@/components/agent/AgentScanCameraView";
import { VerifyTicketResultPanel } from "@/components/verify/VerifyTicketResultPanel";
import {
  fetchVerifyResult,
  parseVerifyQrPayload,
} from "@/lib/tickets/parse-verify-qr";
import type { VerifyResult } from "@/lib/verify/verify-result";
import { useT } from "@/components/providers/LocaleProvider";

type ScanPhase = "camera" | "result";

const ScanIcon = AGENT_SCAN_NAV_ITEM.icon;

export function AgentScanView() {
  const t = useT();
  const [phase, setPhase] = useState<ScanPhase>("camera");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [publicId, setPublicId] = useState<string | undefined>();
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState("");

  const runVerify = useCallback(
    async (credentials: { publicId: string; token: string }) => {
      setLoading(true);
      setPhase("result");
      setPublicId(credentials.publicId);
      setCameraError(null);

      try {
        const data = (await fetchVerifyResult(
          credentials.publicId,
          credentials.token
        )) as VerifyResult;
        setResult(data);
      } catch {
        setResult({
          valid: false,
          status: "invalid",
          message: t("verify.invalidSub"),
        });
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  const handleDecoded = useCallback(
    (text: string) => {
      const parsed = parseVerifyQrPayload(text);
      if (!parsed) {
        toast.error(t("agent.scan.invalidQr"));
        return;
      }
      void runVerify(parsed);
    },
    [runVerify, t]
  );

  function handleScanAgain() {
    setPhase("camera");
    setResult(null);
    setPublicId(undefined);
    setCameraError(null);
    setManualUrl("");
  }

  function handleManualVerify() {
    const parsed = parseVerifyQrPayload(manualUrl);
    if (!parsed) {
      toast.error(t("agent.scan.invalidQr"));
      return;
    }
    void runVerify(parsed);
  }

  if (phase === "camera") {
    return (
      <>
        <Box
          sx={{
            display: { xs: "none", sm: "block" },
            width: "100%",
            maxWidth: 480,
            mx: "auto",
            mb: 2,
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mb: 1, color: "primary.600", "& svg": { fontSize: 28 } }}
          >
            <ScanIcon />
            <Typography level="h3">{t("agent.scan.title")}</Typography>
          </Stack>
          <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
            {t("agent.scan.subtitle")}
          </Typography>
        </Box>

        <Box sx={{ display: { xs: "none", sm: "block" }, maxWidth: 480, mx: "auto", width: "100%" }}>
          <Card variant="outlined" sx={{ p: 0, overflow: "hidden" }}>
            <AgentScanCameraView
              active
              cameraError={cameraError}
              onScan={handleDecoded}
              onError={(msg) => setCameraError(msg)}
              manualUrl={manualUrl}
              onManualUrlChange={setManualUrl}
              onManualVerify={handleManualVerify}
            />
          </Card>
        </Box>

        <Box sx={{ display: { xs: "block", sm: "none" } }}>
          <AgentScanCameraView
            active
            cameraError={cameraError}
            onScan={handleDecoded}
            onError={(msg) => setCameraError(msg)}
            manualUrl={manualUrl}
            onManualUrlChange={setManualUrl}
            onManualVerify={handleManualVerify}
          />
        </Box>
      </>
    );
  }

  return (
    <Box sx={{ width: "100%", maxWidth: 480, mx: "auto" }}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ mb: 2, color: "primary.600", "& svg": { fontSize: 28 } }}
      >
        <ScanIcon />
        <Typography level="h3">{t("agent.scan.title")}</Typography>
      </Stack>

      <Stack spacing={2}>
        <Card variant="outlined" sx={{ p: 2 }}>
          <VerifyTicketResultPanel
            result={result}
            publicId={publicId}
            loading={loading}
            compact
          />
        </Card>
        <Button variant="solid" onClick={handleScanAgain} startDecorator={<ScanIcon />}>
          {t("agent.scan.scanAgain")}
        </Button>
      </Stack>
    </Box>
  );
}
