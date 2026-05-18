"use client";

import Modal from "@mui/joy/Modal";
import ModalDialog from "@mui/joy/ModalDialog";
import ModalClose from "@mui/joy/ModalClose";
import Typography from "@mui/joy/Typography";
import Box from "@mui/joy/Box";

const gold = "#c9a227";

export function PremiumModalDialog({
  open,
  onClose,
  title,
  subtitle,
  maxWidth = 440,
  bodyPadding = true,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidth?: number;
  /** When false, children control their own padding (full-bleed layouts). */
  bodyPadding?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        variant="outlined"
        sx={{
          maxWidth,
          width: { xs: "calc(100% - 24px)", sm: "100%" },
          maxHeight: "min(92dvh, 900px)",
          display: "flex",
          flexDirection: "column",
          borderColor: "primary.400",
          boxShadow: "lg",
          overflow: "hidden",
          p: 0,
          my: { xs: 1.5, sm: 2 },
        }}
      >
        <Box
          sx={{
            flexShrink: 0,
            px: 2.5,
            py: 2,
            pr: 5,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "neutral.900",
          }}
        >
          <ModalClose sx={{ color: "neutral.300", top: 12, right: 12 }} />
          <Typography
            level="body-xs"
            sx={{ color: gold, letterSpacing: "0.22em", fontWeight: 600 }}
          >
            PREMIUM LOTTERY
          </Typography>
          <Typography level="h4" sx={{ color: "common.white", mt: 0.5 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography level="body-sm" sx={{ color: "neutral.400", mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
            ...(bodyPadding ? { p: 2.5 } : undefined),
          }}
        >
          {children}
        </Box>
      </ModalDialog>
    </Modal>
  );
}
