"use client";

import type { ReactNode } from "react";
import Box from "@mui/joy/Box";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import type { SvgIconComponent } from "@mui/icons-material";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import InstallMobileRoundedIcon from "@mui/icons-material/InstallMobileRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { useT } from "@/components/providers/LocaleProvider";

export type InstallGuideVariant = "ios" | "android" | "desktop";

function StepChip({
  icon: Icon,
  label,
}: {
  icon: SvgIconComponent;
  label: string;
}) {
  return (
    <Stack alignItems="center" spacing={0.5} sx={{ minWidth: 72, maxWidth: 96 }}>
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: "md",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.surface",
          border: "1px solid",
          borderColor: "divider",
          color: "primary.700",
          "& svg": { fontSize: 26 },
        }}
      >
        <Icon />
      </Box>
      <Typography
        level="body-xs"
        sx={{
          fontWeight: 600,
          textAlign: "center",
          lineHeight: 1.25,
          color: "text.primary",
        }}
      >
        {label}
      </Typography>
    </Stack>
  );
}

function StepArrow() {
  return (
    <Box
      sx={{
        color: "primary.500",
        display: "flex",
        alignItems: "center",
        pt: 1.5,
        "& svg": { fontSize: 20 },
      }}
      aria-hidden
    >
      <ArrowForwardRoundedIcon />
    </Box>
  );
}

export function AgentInstallPromptGuide({ variant }: { variant: InstallGuideVariant }) {
  const t = useT();

  const steps: { icon: SvgIconComponent; label: string }[] =
    variant === "ios"
      ? [
          { icon: ShareRoundedIcon, label: t("agent.pwa.stepShare") },
          { icon: HomeRoundedIcon, label: t("agent.pwa.stepAddHome") },
        ]
      : variant === "android"
      ? [
          { icon: MoreVertRoundedIcon, label: t("agent.pwa.stepMenu") },
          { icon: HomeRoundedIcon, label: t("agent.pwa.stepAddHome") },
        ]
        : [
            { icon: MoreVertRoundedIcon, label: t("agent.pwa.stepMenu") },
            { icon: InstallMobileRoundedIcon, label: t("agent.pwa.stepInstall") },
          ];

  return (
    <Stack spacing={1.25}>
      <Typography level="body-sm">{t("agent.pwa.intro")}</Typography>
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="center"
        spacing={0.75}
        sx={{ flexWrap: "wrap", rowGap: 0.5 }}
      >
        {steps.reduce<ReactNode[]>((acc, step, index) => {
          if (index > 0) acc.push(<StepArrow key={`arrow-${index}`} />);
          acc.push(<StepChip key={step.label} icon={step.icon} label={step.label} />);
          return acc;
        }, [])}
      </Stack>
      {variant === "desktop" && (
        <Typography level="body-xs" sx={{ color: "text.tertiary", textAlign: "center" }}>
          {t("agent.pwa.desktopExtra")}
        </Typography>
      )}
    </Stack>
  );
}
