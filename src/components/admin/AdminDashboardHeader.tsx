"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { useT } from "@/components/providers/LocaleProvider";

export function AdminDashboardHeader() {
  const t = useT();
  return (
    <PageHeader
      title={t("admin.dashboard.title")}
      description={t("admin.dashboard.description")}
    />
  );
}
