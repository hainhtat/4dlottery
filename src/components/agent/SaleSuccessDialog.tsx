"use client";

import { useState } from "react";
import Button from "@mui/joy/Button";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import PhotoLibraryRoundedIcon from "@mui/icons-material/PhotoLibraryRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import { PremiumModalDialog } from "@/components/ui/PremiumModalDialog";
import { useT } from "@/components/providers/LocaleProvider";
import { downloadTicketPdf } from "@/lib/tickets/download-pdf";
import {
  prefersTicketImages,
  saveTicketImagesWithToast,
  type TicketImageRef,
} from "@/lib/tickets/save-ticket-images";

export function SaleSuccessDialog({
  open,
  batchId,
  tickets,
  onClose,
}: {
  open: boolean;
  batchId: string;
  tickets: TicketImageRef[];
  onClose: () => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState<"gallery" | "pdf" | null>(null);

  async function handleGallery() {
    setBusy("gallery");
    try {
      await saveTicketImagesWithToast(tickets);
    } finally {
      setBusy(null);
    }
  }

  async function handlePdf() {
    setBusy("pdf");
    try {
      await downloadTicketPdf(batchId);
    } finally {
      setBusy(null);
    }
  }

  return (
    <PremiumModalDialog
      open={open}
      onClose={() => !busy && onClose()}
      title={t("agent.sell.successTitle")}
      subtitle={t("agent.sell.successSubtitle", { count: tickets.length })}
      maxWidth={420}
    >
      <Stack spacing={2}>
        <Typography level="body-sm" sx={{ color: "text.secondary" }}>
          {prefersTicketImages()
            ? t("agent.sell.successHintMobile")
            : t("agent.sell.successHintDesktop")}
        </Typography>
        <Button
          size="lg"
          fullWidth
          startDecorator={<PhotoLibraryRoundedIcon />}
          loading={busy === "gallery"}
          disabled={!!busy}
          onClick={() => void handleGallery()}
        >
          {t("agent.tickets.saveToGallery", { count: tickets.length })}
        </Button>
        <Button
          size="lg"
          variant="soft"
          color="neutral"
          fullWidth
          startDecorator={<PictureAsPdfRoundedIcon />}
          loading={busy === "pdf"}
          disabled={!!busy}
          onClick={() => void handlePdf()}
        >
          {t("agent.tickets.downloadPdf")}
        </Button>
        <Button variant="plain" color="neutral" fullWidth disabled={!!busy} onClick={onClose}>
          {t("agent.sell.done")}
        </Button>
      </Stack>
    </PremiumModalDialog>
  );
}
