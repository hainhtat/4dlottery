"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Box from "@mui/joy/Box";
import Typography from "@mui/joy/Typography";
import Stack from "@mui/joy/Stack";
import Divider from "@mui/joy/Divider";
import { formatDisplayDateTime } from "@/lib/pdf/format-datetime";
import { useLocale, useT } from "@/components/providers/LocaleProvider";

const gold = "#c9a227";
const navy = "#0f172a";
const slate = "#1e293b";
const muted = "#94a3b8";

type DrawOutcome = "pending" | "winner" | "not_winner";
type DisplayStatus = "valid" | "revoked" | "invalid" | "winner" | "not_winner";

interface VerifyResult {
  valid: boolean;
  status: string;
  drawOutcome?: DrawOutcome;
  message?: string;
  roundStatus?: string;
  roundName?: string;
  number?: string;
  buyerNameMasked?: string;
  buyerContactMasked?: string;
  agentName?: string;
  issuedAt?: string;
  winningNumber?: string | null;
}

const statusMeta: Record<
  DisplayStatus,
  { labelKey: string; accent: string; glow: string; subKey: string }
> = {
  valid: {
    labelKey: "verify.authentic",
    accent: "#4ade80",
    glow: "rgba(74, 222, 128, 0.35)",
    subKey: "verify.authenticSub",
  },
  winner: {
    labelKey: "verify.winner",
    accent: gold,
    glow: "rgba(201, 162, 39, 0.45)",
    subKey: "verify.winnerSub",
  },
  not_winner: {
    labelKey: "verify.notWinner",
    accent: "#94a3b8",
    glow: "rgba(148, 163, 184, 0.2)",
    subKey: "verify.notWinnerSub",
  },
  revoked: {
    labelKey: "verify.revoked",
    accent: "#fbbf24",
    glow: "rgba(251, 191, 36, 0.3)",
    subKey: "verify.revokedSub",
  },
  invalid: {
    labelKey: "verify.invalid",
    accent: "#f87171",
    glow: "rgba(248, 113, 113, 0.3)",
    subKey: "verify.invalidSub",
  },
};

function resolveDisplayStatus(result: VerifyResult): DisplayStatus {
  if (result.status === "invalid" || (!result.valid && result.status !== "revoked")) {
    return "invalid";
  }
  if (result.status === "revoked") return "revoked";
  if (result.drawOutcome === "winner") return "winner";
  if (result.drawOutcome === "not_winner") return "not_winner";
  return "valid";
}

export function VerifyTicketView() {
  const t = useT();
  const { locale } = useLocale();
  const params = useParams<{ publicId: string; token?: string }>();
  const searchParams = useSearchParams();
  const publicId = params.publicId;
  const token = params.token ?? searchParams.get("t") ?? undefined;

  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!publicId) {
      setResult({ valid: false, status: "invalid", message: t("verify.missingId") });
      setLoading(false);
      return;
    }

    if (!token) {
      setResult({ valid: false, status: "invalid", message: t("verify.missingToken") });
      setLoading(false);
      return;
    }

    fetch(`/api/verify?publicId=${encodeURIComponent(publicId)}&t=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then(setResult)
      .finally(() => setLoading(false));
  }, [publicId, token]);

  const displayStatus = result ? resolveDisplayStatus(result) : "invalid";
  const meta = statusMeta[displayStatus];
  const showDetails =
    result &&
    (result.valid || result.status === "revoked" || displayStatus === "not_winner");

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `
          radial-gradient(ellipse 80% 50% at 50% -10%, rgba(201, 162, 39, 0.18), transparent),
          linear-gradient(155deg, ${navy} 0%, ${slate} 42%, ${navy} 100%)
        `,
        p: 2,
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 440,
          borderRadius: "xl",
          border: `1px solid ${gold}`,
          background: `linear-gradient(180deg, ${slate} 0%, ${navy} 100%)`,
          boxShadow: `
            0 0 0 1px rgba(201, 162, 39, 0.15),
            0 24px 48px rgba(0, 0, 0, 0.45),
            0 0 80px rgba(201, 162, 39, 0.08)
          `,
          overflow: "hidden",
        }}
      >
        <Box sx={{ px: { xs: 2.5, sm: 3 }, pt: 2.5, pb: 1 }}>
          <Typography
            level="body-xs"
            sx={{
              color: gold,
              letterSpacing: "0.28em",
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            PREMIUM LOTTERY
          </Typography>
          <Typography
            level="h4"
            sx={{
              color: "#f8fafc",
              textAlign: "center",
              mt: 0.75,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            {t("verify.title")}
          </Typography>
        </Box>

        <Divider sx={{ borderColor: "rgba(201, 162, 39, 0.35)" }} />

        <Box sx={{ px: { xs: 2.5, sm: 3 }, py: 3 }}>
          {loading && <LoadingState label={t("verify.loading")} />}

          {!loading && result && (
            <Stack spacing={2.5}>
              <Box
                sx={{
                  textAlign: "center",
                  py: 2,
                  px: 2,
                  borderRadius: "lg",
                  border: `1px solid ${meta.accent}44`,
                  background: `linear-gradient(180deg, ${meta.glow} 0%, transparent 70%)`,
                }}
              >
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1,
                    px: 2,
                    py: 0.75,
                    borderRadius: "999px",
                    border: `1px solid ${meta.accent}`,
                    backgroundColor: "rgba(15, 23, 42, 0.6)",
                    boxShadow: `0 0 20px ${meta.glow}`,
                    mb: 1,
                  }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: meta.accent,
                      boxShadow: `0 0 8px ${meta.accent}`,
                    }}
                  />
                  <Typography
                    level="title-md"
                    sx={{ color: meta.accent, fontWeight: 700, letterSpacing: "0.12em" }}
                  >
                    {t(meta.labelKey).toUpperCase()}
                  </Typography>
                </Box>
                <Typography level="body-xs" sx={{ color: muted }}>
                  {result.message ?? t(meta.subKey)}
                </Typography>
              </Box>

              {showDetails && result.number && (
                <Box
                  sx={{
                    textAlign: "center",
                    py: 2,
                    px: 2,
                    borderRadius: "lg",
                    bgcolor: "rgba(15, 23, 42, 0.55)",
                    border: "1px solid rgba(71, 85, 105, 0.6)",
                  }}
                >
                  <Typography
                    level="body-xs"
                    sx={{ color: muted, letterSpacing: "0.2em", mb: 0.75 }}
                  >
                    {t("verify.yourNumber")}
                  </Typography>
                  <Typography
                    sx={{
                      color: "#f8fafc",
                      fontSize: "2.25rem",
                      fontWeight: 700,
                      letterSpacing: "0.35em",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {result.number}
                  </Typography>
                </Box>
              )}

              {showDetails && (
                <Box
                  sx={{
                    borderRadius: "lg",
                    border: "1px solid rgba(71, 85, 105, 0.5)",
                    bgcolor: "rgba(15, 23, 42, 0.4)",
                    overflow: "hidden",
                  }}
                >
                  <DetailRow label={t("verify.round")} value={result.roundName} />
                  <DetailRow label={t("agent.tickets.col.status")} value={result.roundStatus} highlight />
                  <DetailRow label={t("pdf.holder")} value={result.buyerNameMasked} />
                  <DetailRow label={t("verify.contact")} value={result.buyerContactMasked} />
                  <DetailRow label={t("verify.agent")} value={result.agentName} />
                  <DetailRow
                    label={t("verify.issued")}
                    value={
                      result.issuedAt ? formatDisplayDateTime(result.issuedAt, locale) : undefined
                    }
                  />
                  {result.winningNumber && (
                    <DetailRow
                      label={t("verify.officialResult")}
                      value={result.winningNumber}
                      highlight
                    />
                  )}
                </Box>
              )}

              <Typography
                level="body-xs"
                sx={{
                  color: "#64748b",
                  textAlign: "center",
                  letterSpacing: "0.06em",
                  pt: 0.5,
                }}
              >
                Secured digital signature · ID {publicId}
              </Typography>
            </Stack>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <Stack spacing={2} alignItems="center" sx={{ py: 2 }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          border: `2px solid rgba(201, 162, 39, 0.25)`,
          borderTopColor: gold,
          animation: "verifySpin 0.9s linear infinite",
          "@keyframes verifySpin": {
            to: { transform: "rotate(360deg)" },
          },
        }}
      />
      <Typography level="body-sm" sx={{ color: muted, letterSpacing: "0.04em" }}>
        {label}
      </Typography>
    </Stack>
  );
}

function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value?: string;
  highlight?: boolean;
}) {
  if (!value) return null;
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      sx={{
        px: 2,
        py: 1.25,
        borderBottom: "1px solid rgba(71, 85, 105, 0.35)",
        "&:last-child": { borderBottom: "none" },
      }}
    >
      <Typography level="body-sm" sx={{ color: muted }}>
        {label}
      </Typography>
      <Typography
        level="body-sm"
        sx={{
          color: highlight ? gold : "#f1f5f9",
          fontWeight: highlight ? 600 : 500,
          textTransform: highlight ? "capitalize" : "none",
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}
