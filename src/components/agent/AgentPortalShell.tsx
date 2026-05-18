"use client";

import Box from "@mui/joy/Box";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { AgentRefreshProvider } from "@/components/agent/AgentRefreshContext";
import { AgentLiveSync } from "@/components/agent/AgentLiveSync";
import {
  AgentMobileBottomNav,
  AGENT_MOBILE_TAB_BAR_RESERVE,
} from "@/components/agent/AgentMobileBottomNav";
import { AGENT_SIDEBAR_NAV } from "@/components/agent/agentNav";
import { AgentMobileAccountMenu } from "@/components/agent/AgentMobileAccountMenu";
import { AgentInstallPrompt } from "@/components/agent/AgentInstallPrompt";
import { AgentNotificationBanner } from "@/components/agent/AgentNotificationBanner";

export function AgentPortalShell({ children }: { children: React.ReactNode }) {
  return (
    <AgentRefreshProvider>
      <AgentLiveSync />
      <Box
        className="agent-app-shell"
        sx={{
          "--agent-tab-bar-reserve": `${AGENT_MOBILE_TAB_BAR_RESERVE}px`,
          minHeight: "100dvh",
          height: { xs: "100dvh", sm: "auto" },
          overflow: { xs: "hidden", sm: "visible" },
        }}
      >
        <DashboardShell
          portalLabelKey="common.agent"
          nav={AGENT_SIDEBAR_NAV}
          sidebarFromSm
          mobileBottomNav={<AgentMobileBottomNav />}
          renderMobileAccountDrawer={({ onNavigate, onLogout }) => (
            <AgentMobileAccountMenu onNavigate={onNavigate} onLogout={onLogout} />
          )}
        >
          <AgentInstallPrompt />
          <AgentNotificationBanner />
          {children}
        </DashboardShell>
      </Box>
    </AgentRefreshProvider>
  );
}
