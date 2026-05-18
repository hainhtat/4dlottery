"use client";

import Box from "@mui/joy/Box";
import Typography from "@mui/joy/Typography";
import Stack from "@mui/joy/Stack";
import { formatDisplayDateTime } from "@/lib/pdf/format-datetime";
import { useLocale, useT } from "@/components/providers/LocaleProvider";
import {
  resolveVerifyDisplayStatus,
  verifyStatusMeta,
  type VerifyResult,
} from "@/lib/verify/verify-result";

const gold = "#c9a227";
const muted = "#94a3b8";

export function VerifyTicketResultPanel({
  result,
  publicId,
  loading,
  compact,
}: {
  result: VerifyResult | null;
  publicId?: string;
  loading?: boolean;
  compact?: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();

  if (loading) {
    return <VerifyLoadingState label={t("verify.loading")} />;
  }

  if (!result) return null;

  const displayStatus = resolveVerifyDisplayStatus(result);
  const meta = verifyStatusMeta[displayStatus];
  const showDetails =
    result.valid || result.status === "revoked" || displayStatus === "not_winner";

  return (
    <Stack spacing={compact ? 2 : 2.5}>
      <Box
        sx={{
          textAlign: "center",
          py: compact ? 1.5 : 2,
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
            backgroundColor: "rgba(15, 23, 42, 0.06)",
            boxShadow: compact ? "none" : `0 0 20px ${meta.glow}`,
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
        <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
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
            bgcolor: "background.level1",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography level="body-xs" sx={{ color: "text.tertiary", letterSpacing: "0.2em", mb: 0.75 }}>
            {t("verify.yourNumber")}
          </Typography>
          <Typography
            sx={{
              fontSize: compact ? "1.75rem" : "2.25rem",
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
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.surface",
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
            value={result.issuedAt ? formatDisplayDateTime(result.issuedAt, locale) : undefined}
          />
          {result.winningNumber && (
            <DetailRow label={t("verify.officialResult")} value={result.winningNumber} highlight />
          )}
        </Box>
      )}

      {publicId && (
        <Typography level="body-xs" sx={{ color: "text.tertiary", textAlign: "center" }}>
          {t("verify.ticketId")}: {publicId}
        </Typography>
      )}
    </Stack>
  );
}

function VerifyLoadingState({ label }: { label: string }) {
  return (
    <Stack spacing={2} alignItems="center" sx={{ py: 2 }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          border: "2px solid rgba(201, 162, 39, 0.25)",
          borderTopColor: gold,
          animation: "verifySpin 0.9s linear infinite",
          "@keyframes verifySpin": {
            to: { transform: "rotate(360deg)" },
          },
        }}
      />
      <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
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
        borderBottom: "1px solid",
        borderColor: "divider",
        "&:last-child": { borderBottom: "none" },
      }}
    >
      <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
        {label}
      </Typography>
      <Typography
        level="body-sm"
        sx={{
          color: highlight ? "primary.600" : "text.primary",
          fontWeight: highlight ? 600 : 500,
          textTransform: highlight ? "capitalize" : "none",
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}
