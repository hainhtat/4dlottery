"use client";

import Box from "@mui/joy/Box";
import Sheet from "@mui/joy/Sheet";
import Typography from "@mui/joy/Typography";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AGENT_NAV } from "@/components/agent/agentNav";
import { useT } from "@/components/providers/LocaleProvider";

const SHORT_LABEL_KEYS: Record<string, string> = {
  "/agent/sell": "nav.agent.sellShort",
  "/agent/summary": "nav.agent.summaryShort",
  "/agent/tickets": "nav.agent.ticketsShort",
  "/agent/winners": "nav.agent.winnersShort",
};

export function AgentMobileBottomNav() {
  const nav = AGENT_NAV;
  const pathname = usePathname() ?? "";
  const t = useT();

  return (
    <Sheet
      sx={{
        display: { xs: "block", sm: "none" },
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        borderTop: "1px solid",
        borderColor: "divider",
        bgcolor: "background.surface",
        pb: "var(--safe-bottom)",
        pl: "var(--safe-left)",
        pr: "var(--safe-right)",
      }}
    >
      <Box
        component="nav"
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${nav.length}, 1fr)`,
          gap: 0,
        }}
      >
        {nav.map((item) => {
          const selected =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          const shortKey = SHORT_LABEL_KEYS[item.href];
          return (
            <Box
              key={item.href}
              component={Link}
              href={item.href}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                py: 1,
                px: 0.5,
                minHeight: 56,
                textDecoration: "none",
                color: selected ? "primary.600" : "text.tertiary",
                bgcolor: selected ? "primary.50" : "transparent",
                borderTop: "2px solid",
                borderColor: selected ? "primary.500" : "transparent",
                "& svg": { fontSize: 22 },
              }}
            >
              <Icon fontSize="medium" />
              <Typography
                level="body-xs"
                sx={{
                  mt: 0.25,
                  fontWeight: selected ? 700 : 500,
                  fontSize: "0.65rem",
                  textAlign: "center",
                  lineHeight: 1.2,
                }}
              >
                {shortKey ? t(shortKey) : t(item.labelKey)}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Sheet>
  );
}
