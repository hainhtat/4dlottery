"use client";

import { useCallback, useEffect, useState } from "react";
import Typography from "@mui/joy/Typography";
import Table from "@mui/joy/Table";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import Stack from "@mui/joy/Stack";
import Box from "@mui/joy/Box";
import Card from "@mui/joy/Card";
import Grid from "@mui/joy/Grid";
import Chip from "@mui/joy/Chip";
import Alert from "@mui/joy/Alert";
import { createClient } from "@/lib/supabase/client";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { DataCard } from "@/components/ui/DataCard";
import { formatMoneyDisplay } from "@/lib/utils/money";
import type { Round } from "@/lib/types/database";
import { pickCurrentRoundId } from "@/lib/rounds/pick-current-round";
import { ROUND_CONTEXT_LIMIT } from "@/lib/rounds/fetch-round-context";
import { useLocale, useT } from "@/components/providers/LocaleProvider";
import { formatDisplayDateTime } from "@/lib/pdf/format-datetime";

interface SettlementAgent {
  agent_id: string;
  display_name: string;
  commission_rate: number;
  tickets_sold: number;
  gross_sales: number;
  total_commission: number;
  amount_due: number;
}

interface SettlementPayload {
  round: {
    id: string;
    name: string;
    status: string;
    ticket_price: number;
    prize_amount: number;
    closes_at: string;
  } | null;
  agents: SettlementAgent[];
  totals: {
    tickets_sold: number;
    gross_sales: number;
    total_commission: number;
    amount_due: number;
  } | null;
}

export function AdminDashboardSettlement({
  initialRounds,
  initialAgentCount,
}: {
  initialRounds: Round[];
  initialAgentCount: number;
}) {
  const supabase = createClient();
  const t = useT();
  const { locale } = useLocale();
  const [rounds, setRounds] = useState<Round[]>(initialRounds);
  const [roundId, setRoundId] = useState<string | null>(() =>
    pickCurrentRoundId(initialRounds)
  );

  const fetchRounds = useCallback(async () => {
    const { data, error } = await supabase
      .from("rounds")
      .select(
        "id, name, ticket_price, prize_amount, opens_at, closes_at, status, winning_number, winner_ticket_id, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(ROUND_CONTEXT_LIMIT);
    if (error) throw error;
    return (data ?? []) as Round[];
  }, [supabase]);

  useEffect(() => {
    fetchRounds()
      .then((list) => {
        setRounds(list);
        setRoundId((prev) => prev ?? pickCurrentRoundId(list));
      })
      .catch(() => {});
  }, [fetchRounds]);

  const fetchSettlement = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_round_agent_settlement", {
      p_round_id: roundId,
    });
    if (error) throw error;
    return data as SettlementPayload;
  }, [supabase, roundId]);

  const { data, loading, error, refetch } = useAsyncData(fetchSettlement, [roundId]);

  useEffect(() => {
    if (roundId) refetch({ silent: true }).catch(() => {});
  }, [roundId, refetch]);

  const agents = data?.agents ?? [];
  const totals = data?.totals;
  const round = data?.round;

  useEffect(() => {
    if (round?.id && !roundId) setRoundId(round.id);
  }, [round?.id, roundId]);
  const ticketPrice = round ? Number(round.ticket_price) : 0;
  const prize = round ? Number(round.prize_amount) : 0;
  const poolIfSoldOut = ticketPrice * 10_000;
  const adminReserve = totals ? Number(totals.gross_sales) - prize - Number(totals.total_commission) : null;

  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        <Grid xs={12} sm={4}>
          <StatCard label={t("admin.dashboard.agents")} value={String(initialAgentCount)} />
        </Grid>
        <Grid xs={12} sm={4}>
          <StatCard
            label={t("admin.dashboard.ticketsRound")}
            value={totals ? formatMoneyDisplay(totals.tickets_sold) : "—"}
          />
        </Grid>
        <Grid xs={12} sm={4}>
          <StatCard
            label={t("admin.dashboard.dueFromAgents")}
            value={totals ? formatMoneyDisplay(Number(totals.amount_due)) : "—"}
            highlight
          />
        </Grid>
      </Grid>

      <Card variant="outlined" sx={{ p: 2.5 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography level="title-md">{t("admin.dashboard.settlementTitle")}</Typography>
            <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
              {t("admin.dashboard.settlementSubtitle")}
            </Typography>
          </Box>
          <Select
            value={roundId ?? ""}
            onChange={(_, v) => setRoundId(v || null)}
            sx={{ minWidth: 200 }}
            placeholder={rounds.length === 0 ? t("admin.dashboard.noRounds") : t("admin.dashboard.selectRound")}
            disabled={rounds.length === 0}
          >
            {rounds.map((r) => (
              <Option key={r.id} value={r.id}>
                {r.name} ({r.status})
              </Option>
            ))}
          </Select>
        </Stack>

        {round && (
          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
            <Chip size="sm" variant="soft">
              {t("admin.dashboard.ticketPrice", { price: formatMoneyDisplay(ticketPrice) })}
            </Chip>
            <Chip size="sm" variant="soft" color="primary">
              {t("admin.dashboard.prize", { amount: formatMoneyDisplay(prize) })}
            </Chip>
            <Chip size="sm" variant="outlined">
              {t("common.draw")} {formatDisplayDateTime(round.closes_at, locale)}
            </Chip>
            {poolIfSoldOut > 0 && (
              <Chip size="sm" variant="outlined" color="neutral">
                {t("admin.dashboard.maxPool", { amount: formatMoneyDisplay(poolIfSoldOut) })}
              </Chip>
            )}
          </Stack>
        )}

        {error && (
          <Alert color="danger" sx={{ mb: 2 }}>
            {error}
            <Typography level="body-xs" sx={{ mt: 0.5 }}>
              {t("admin.dashboard.migrationHint")}
            </Typography>
          </Alert>
        )}

        {rounds.length === 0 && !loading && (
          <Alert color="warning" variant="soft" sx={{ mb: 2 }}>
            {t("admin.dashboard.noRoundsAlert")}
          </Alert>
        )}

        <DataCard
          loading={loading}
          empty={!loading && rounds.length > 0 && agents.length === 0}
          emptyMessage={t("admin.dashboard.noSales")}
        >
          <Table hoverRow stickyHeader sx={{ "& thead th": { bgcolor: "background.level1", fontWeight: 600 } }}>
            <thead>
              <tr>
                <th>{t("admin.dashboard.col.agent")}</th>
                <th style={{ textAlign: "right" }}>{t("admin.dashboard.col.tickets")}</th>
                <th style={{ textAlign: "right" }}>{t("admin.dashboard.col.gross")}</th>
                <th style={{ textAlign: "right" }}>{t("admin.dashboard.col.commission")}</th>
                <th style={{ textAlign: "right" }}>{t("admin.dashboard.col.due")}</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.agent_id}>
                  <td>
                    <Typography fontWeight="md">{a.display_name}</Typography>
                    <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                      {t("admin.dashboard.commissionRate", { rate: Number(a.commission_rate) })}
                    </Typography>
                  </td>
                  <td style={{ textAlign: "right" }}>{a.tickets_sold}</td>
                  <td style={{ textAlign: "right" }}>{formatMoneyDisplay(Number(a.gross_sales))}</td>
                  <td style={{ textAlign: "right" }}>{formatMoneyDisplay(Number(a.total_commission))}</td>
                  <td style={{ textAlign: "right" }}>
                    <Typography fontWeight={700} sx={{ color: "primary.700" }}>
                      {formatMoneyDisplay(Number(a.amount_due))}
                    </Typography>
                  </td>
                </tr>
              ))}
            </tbody>
            {totals && agents.length > 0 && (
              <tfoot>
                <tr>
                  <td>
                    <Typography fontWeight={700}>{t("admin.dashboard.total")}</Typography>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Typography fontWeight={700}>{totals.tickets_sold}</Typography>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Typography fontWeight={700}>{formatMoneyDisplay(Number(totals.gross_sales))}</Typography>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Typography fontWeight={700}>
                      {formatMoneyDisplay(Number(totals.total_commission))}
                    </Typography>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Typography fontWeight={700} sx={{ color: "primary.700" }}>
                      {formatMoneyDisplay(Number(totals.amount_due))}
                    </Typography>
                  </td>
                </tr>
              </tfoot>
            )}
          </Table>
        </DataCard>

        {totals && Number(totals.tickets_sold) > 0 && (
          <Alert color="neutral" variant="soft" sx={{ mt: 2 }}>
            {t("admin.dashboard.reserve", {
              amount: formatMoneyDisplay(Math.max(0, adminReserve ?? 0)),
            })}
          </Alert>
        )}
      </Card>
    </Stack>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card variant="soft" sx={{ p: 2.5 }}>
      <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
        {label}
      </Typography>
      <Typography level="h2" sx={{ color: highlight ? "primary.700" : undefined }}>
        {value}
      </Typography>
    </Card>
  );
}
