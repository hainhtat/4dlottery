"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { AgentRefreshProvider } from "@/components/agent/AgentRefreshContext";
import { AgentLiveSync } from "@/components/agent/AgentLiveSync";
import { AgentMobileBottomNav } from "@/components/agent/AgentMobileBottomNav";
import { AGENT_SIDEBAR_NAV } from "@/components/agent/agentNav";
import { AgentMobileAccountMenu } from "@/components/agent/AgentMobileAccountMenu";
import { AgentInstallPrompt } from "@/components/agent/AgentInstallPrompt";

export function AgentPortalShell({ children }: { children: React.ReactNode }) {
  return (
    <AgentRefreshProvider>
      <AgentLiveSync />
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
        {children}
      </DashboardShell>
    </AgentRefreshProvider>
  );
}
