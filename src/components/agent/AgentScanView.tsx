"use client";

import { useCallback, useState } from "react";
import Box from "@mui/joy/Box";
import Typography from "@mui/joy/Typography";
import Card from "@mui/joy/Card";
import Button from "@mui/joy/Button";
import Input from "@mui/joy/Input";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Alert from "@mui/joy/Alert";
import Stack from "@mui/joy/Stack";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import { toast } from "react-toastify";
import { AgentQrScanner } from "@/components/agent/AgentQrScanner";
import { VerifyTicketResultPanel } from "@/components/verify/VerifyTicketResultPanel";
import {
  fetchVerifyResult,
  parseVerifyQrPayload,
} from "@/lib/tickets/parse-verify-qr";
import type { VerifyResult } from "@/lib/verify/verify-result";
import { useT } from "@/components/providers/LocaleProvider";

type ScanPhase = "camera" | "result";

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

  return (
    <Box sx={{ width: "100%", maxWidth: 480, mx: "auto" }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <QrCodeScannerRoundedIcon color="primary" />
        <Typography level="h3">{t("agent.scan.title")}</Typography>
      </Stack>
      <Typography level="body-sm" sx={{ color: "text.tertiary", mb: 2 }}>
        {t("agent.scan.subtitle")}
      </Typography>

      {phase === "camera" && (
        <Stack spacing={2}>
          {cameraError && (
            <Alert color="warning" variant="soft">
              {cameraError}
            </Alert>
          )}
          <Card variant="outlined" sx={{ p: 1.5, overflow: "hidden" }}>
            <AgentQrScanner
              active={phase === "camera"}
              onScan={handleDecoded}
              onError={(msg) => setCameraError(msg)}
            />
          </Card>
          <Typography level="body-xs" sx={{ color: "text.tertiary", textAlign: "center" }}>
            {t("agent.scan.hint")}
          </Typography>

          <FormControl>
            <FormLabel>{t("agent.scan.manualLabel")}</FormLabel>
            <Input
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder={t("agent.scan.manualPlaceholder")}
              slotProps={{ input: { sx: { fontSize: "0.85rem" } } }}
            />
          </FormControl>
          <Button variant="soft" onClick={handleManualVerify} disabled={!manualUrl.trim()}>
            {t("agent.scan.manualSubmit")}
          </Button>
        </Stack>
      )}

      {phase === "result" && (
        <Stack spacing={2}>
          <Card variant="outlined" sx={{ p: 2 }}>
            <VerifyTicketResultPanel
              result={result}
              publicId={publicId}
              loading={loading}
              compact
            />
          </Card>
          <Button variant="solid" onClick={handleScanAgain} startDecorator={<QrCodeScannerRoundedIcon />}>
            {t("agent.scan.scanAgain")}
          </Button>
        </Stack>
      )}
    </Box>
  );
}
