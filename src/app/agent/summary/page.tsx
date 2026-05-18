"use client";

import { AgentSettlementSummary } from "@/components/agent/AgentSettlementSummary";
import { PageHeader } from "@/components/ui/PageHeader";
import { useT } from "@/components/providers/LocaleProvider";

export default function AgentSummaryPage() {
  const t = useT();
  return (
    <>
      <PageHeader
        title={t("agent.summary.pageTitle")}
        description={t("agent.summary.pageDescription")}
      />
      <AgentSettlementSummary showWinnerOnMyWin />
    </>
  );
}
