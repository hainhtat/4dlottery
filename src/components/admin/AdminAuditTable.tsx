"use client";

import { useCallback, useMemo } from "react";
import Typography from "@mui/joy/Typography";
import Table from "@mui/joy/Table";
import { createClient } from "@/lib/supabase/client";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataCard } from "@/components/ui/DataCard";
import { useLocale, useT } from "@/components/providers/LocaleProvider";
import { formatDisplayDateTime } from "@/lib/pdf/format-datetime";
import {
  formatAuditAction,
  formatAuditDetails,
  formatAuditEntity,
  type AuditEventRow,
  type AuditLookup,
} from "@/lib/audit/format-audit-event";

export function AdminAuditTable() {
  const supabase = createClient();
  const t = useT();
  const { locale } = useLocale();

  const fetchEvents = useCallback(async () => {
    const [eventsRes, roundsRes, profilesRes] = await Promise.all([
      supabase
        .from("audit_events")
        .select("id, entity_type, entity_id, action, payload, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("rounds").select("id, name"),
      supabase.from("profiles").select("id, display_name"),
    ]);

    if (eventsRes.error) throw eventsRes.error;
    if (roundsRes.error) throw roundsRes.error;
    if (profilesRes.error) throw profilesRes.error;

    return {
      events: (eventsRes.data ?? []) as (AuditEventRow & { id: string; created_at: string })[],
      rounds: roundsRes.data ?? [],
      profiles: profilesRes.data ?? [],
    };
  }, [supabase]);

  const { data, loading } = useAsyncData(fetchEvents);

  const lookup = useMemo<AuditLookup>(() => {
    const roundMap = new Map((data?.rounds ?? []).map((r) => [r.id, r.name]));
    const agentMap = new Map((data?.profiles ?? []).map((p) => [p.id, p.display_name]));
    return {
      roundName: (id) => (id ? roundMap.get(id) ?? null : null),
      agentName: (id) => (id ? agentMap.get(id) ?? null : null),
    };
  }, [data?.rounds, data?.profiles]);

  const events = data?.events ?? [];

  return (
    <>
      <PageHeader title={t("admin.audit.title")} description={t("admin.audit.description")} />
      <DataCard loading={loading} empty={!loading && events.length === 0} emptyMessage={t("admin.audit.empty")}>
        <Table
          hoverRow
          stickyHeader
          sx={{ "& thead th": { bgcolor: "background.level1", fontWeight: 600 } }}
        >
          <thead>
            <tr>
              <th>{t("admin.audit.col.time")}</th>
              <th>{t("admin.audit.col.entity")}</th>
              <th>{t("admin.audit.col.action")}</th>
              <th>{t("admin.audit.col.details")}</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td>
                  <Typography level="body-sm">{formatDisplayDateTime(e.created_at, locale)}</Typography>
                </td>
                <td>
                  <Typography level="body-sm">{formatAuditEntity(e, lookup, t)}</Typography>
                </td>
                <td>
                  <Typography level="body-sm" fontWeight={500}>
                    {formatAuditAction(e.action, t)}
                  </Typography>
                </td>
                <td>
                  <Typography level="body-sm" sx={{ maxWidth: { xs: 280, md: 480 } }}>
                    {formatAuditDetails(e, lookup, t)}
                  </Typography>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </DataCard>
    </>
  );
}
