"use client";

import Box from "@mui/joy/Box";
import Sheet from "@mui/joy/Sheet";
import Typography from "@mui/joy/Typography";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SvgIconComponent } from "@mui/icons-material";
import {
  AGENT_MOBILE_NAV_LEFT,
  AGENT_MOBILE_NAV_RIGHT,
  AGENT_SCAN_HREF,
  AGENT_SCAN_NAV_ITEM,
} from "@/components/agent/agentNav";
import { useT } from "@/components/providers/LocaleProvider";

const SHORT_LABEL_KEYS: Record<string, string> = {
  "/agent/sell": "nav.agent.sellShort",
  "/agent/summary": "nav.agent.summaryShort",
  "/agent/tickets": "nav.agent.ticketsShort",
  "/agent/winners": "nav.agent.winnersShort",
};

const TAB_BAR_HEIGHT = 64;
const FAB_SIZE = 58;
const FAB_LIFT = 22;

function NavTab({
  href,
  label,
  selected,
  icon: Icon,
}: {
  href: string;
  label: string;
  selected: boolean;
  icon: SvgIconComponent;
}) {
  return (
    <Box
      component={Link}
      href={href}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 1,
        minHeight: TAB_BAR_HEIGHT,
        textDecoration: "none",
        color: selected ? "neutral.900" : "neutral.400",
        transition: "color 0.15s ease",
        "& svg": { fontSize: 22 },
      }}
    >
      <Icon />
      <Typography
        level="body-xs"
        sx={{
          mt: 0.35,
          fontWeight: selected ? 700 : 500,
          fontSize: "0.65rem",
          lineHeight: 1.2,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

export function AgentMobileBottomNav() {
  const pathname = usePathname() ?? "";
  const t = useT();
  const ScanIcon = AGENT_SCAN_NAV_ITEM.icon;
  const scanSelected =
    pathname === AGENT_SCAN_HREF || pathname.startsWith(`${AGENT_SCAN_HREF}/`);

  return (
    <Box
      sx={{
        display: { xs: "block", sm: "none" },
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        pointerEvents: "none",
        pb: "var(--safe-bottom)",
        pl: "max(12px, var(--safe-left))",
        pr: "max(12px, var(--safe-right))",
      }}
    >
      <Box
        sx={{
          position: "relative",
          pointerEvents: "auto",
          maxWidth: 440,
          mx: "auto",
          pt: `${FAB_LIFT}px`,
        }}
      >
        <Box
          component={Link}
          href={AGENT_SCAN_HREF}
          aria-label={t("nav.agent.scan")}
          aria-current={scanSelected ? "page" : undefined}
          sx={{
            position: "absolute",
            left: "50%",
            top: 0,
            transform: "translateX(-50%)",
            zIndex: 2,
            width: FAB_SIZE,
            height: FAB_SIZE,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: scanSelected ? "primary.600" : "neutral.900",
            color: "#fff",
            boxShadow: scanSelected
              ? "0 8px 28px rgba(201, 162, 39, 0.45)"
              : "0 8px 24px rgba(15, 23, 42, 0.35)",
            textDecoration: "none",
            border: "3px solid",
            borderColor: "background.surface",
            transition: "background-color 0.15s ease, box-shadow 0.15s ease",
            "& svg": { fontSize: 28 },
          }}
        >
          <ScanIcon />
        </Box>

        <Sheet
          component="nav"
          variant="outlined"
          sx={{
            borderRadius: "999px",
            bgcolor: "background.surface",
            boxShadow: "0 4px 24px rgba(15, 23, 42, 0.12), 0 1px 4px rgba(15, 23, 42, 0.06)",
            border: "1px solid",
            borderColor: "divider",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 72px 1fr 1fr",
            alignItems: "end",
            overflow: "hidden",
            minHeight: TAB_BAR_HEIGHT,
          }}
        >
          {AGENT_MOBILE_NAV_LEFT.map((item) => {
            const selected =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const shortKey = SHORT_LABEL_KEYS[item.href];
            if (!item.icon) return null;
            return (
              <NavTab
                key={item.href}
                href={item.href}
                selected={selected}
                icon={item.icon}
                label={shortKey ? t(shortKey) : t(item.labelKey)}
              />
            );
          })}
          <Box aria-hidden sx={{ minHeight: TAB_BAR_HEIGHT }} />
          {AGENT_MOBILE_NAV_RIGHT.map((item) => {
            const selected =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const shortKey = SHORT_LABEL_KEYS[item.href];
            if (!item.icon) return null;
            return (
              <NavTab
                key={item.href}
                href={item.href}
                selected={selected}
                icon={item.icon}
                label={shortKey ? t(shortKey) : t(item.labelKey)}
              />
            );
          })}
        </Sheet>
      </Box>
    </Box>
  );
}

/** Total vertical space reserved above safe area for the floating tab bar + FAB. */
export const AGENT_MOBILE_TAB_BAR_RESERVE = TAB_BAR_HEIGHT + FAB_LIFT + 12;
