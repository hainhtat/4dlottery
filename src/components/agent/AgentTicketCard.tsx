"use client";

import Typography from "@mui/joy/Typography";
import Card from "@mui/joy/Card";
import Stack from "@mui/joy/Stack";
import Chip from "@mui/joy/Chip";
import Button from "@mui/joy/Button";
import Box from "@mui/joy/Box";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import { formatDisplayDateTime } from "@/lib/pdf/format-datetime";
import { downloadTicketPdf } from "@/lib/tickets/download-pdf";
import { useLocale, useT } from "@/components/providers/LocaleProvider";

export interface AgentTicketCardProps {
  publicId: string;
  roundName: string;
  number: string;
  buyerName: string;
  commission: number;
  status: string;
  issuedAt: string;
  batchId: string | null;
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
        {label}
      </Typography>
      <Typography
        level="body-sm"
        fontWeight={600}
        sx={{
          wordBreak: "break-word",
          letterSpacing: mono ? "0.2em" : undefined,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export function AgentTicketCard({
  publicId,
  roundName,
  number,
  buyerName,
  commission,
  status,
  issuedAt,
  batchId,
}: AgentTicketCardProps) {
  const t = useT();
  const { locale } = useLocale();
  const isVoided = status === "voided";

  return (
    <Card
      variant="outlined"
      sx={{
        p: 2,
        opacity: isVoided ? 0.55 : 1,
        bgcolor: isVoided ? "background.level1" : "background.surface",
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            level="h3"
            sx={{ letterSpacing: "0.28em", fontWeight: 700, lineHeight: 1.1 }}
          >
            {number}
          </Typography>
          <Typography level="body-xs" sx={{ color: "text.tertiary", mt: 0.5 }}>
            {roundName}
          </Typography>
        </Box>
        <Chip size="sm" variant="soft" color={status === "active" ? "success" : "danger"}>
          {status}
        </Chip>
      </Stack>

      <Stack spacing={1.25} sx={{ mb: 1.5 }}>
        <Detail label={t("agent.tickets.card.ticketId")} value={publicId} />
        <Stack direction="row" spacing={2}>
          <Box sx={{ flex: 1 }}>
            <Detail label={t("agent.tickets.card.buyer")} value={buyerName} />
          </Box>
          <Box>
            <Detail
              label={t("agent.tickets.card.commission")}
              value={commission.toLocaleString()}
            />
          </Box>
        </Stack>
        <Detail label={t("agent.tickets.card.issued")} value={formatDisplayDateTime(issuedAt, locale)} />
      </Stack>

      {batchId && !isVoided && (
        <Button
          size="sm"
          variant="soft"
          color="primary"
          fullWidth
          startDecorator={<PrintRoundedIcon />}
          onClick={() => void downloadTicketPdf(batchId)}
        >
          {t("agent.tickets.reprint")}
        </Button>
      )}
      {batchId && isVoided && (
        <Button size="sm" variant="soft" color="neutral" fullWidth disabled>
          {t("agent.tickets.voidedNoPdf")}
        </Button>
      )}
    </Card>
  );
}
