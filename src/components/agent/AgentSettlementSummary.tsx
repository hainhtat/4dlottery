"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Typography from "@mui/joy/Typography";
import Card from "@mui/joy/Card";
import Stack from "@mui/joy/Stack";
import Grid from "@mui/joy/Grid";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import Chip from "@mui/joy/Chip";
import Alert from "@mui/joy/Alert";
import Box from "@mui/joy/Box";
import { createClient } from "@/lib/supabase/client";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { formatMoneyDisplay } from "@/lib/utils/money";
import { formatDisplayDateTime } from "@/lib/pdf/format-datetime";
import { useAgentRefresh } from "@/components/agent/AgentRefreshContext";
import { useLocale, useT } from "@/components/providers/LocaleProvider";

interface RoundSettlement {
  id: string;
  name: string;
  status: string;
  ticket_price: number;
  closes_at: string;
  tickets_sold: number;
  collected_from_buyers: number;
  commission_earned: number;
  amount_due_admin: number;
}

interface SettlementCurrent {
  round_id: string;
  round_name: string;
  round_status: string;
  ticket_price: number;
  closes_at: string;
  tickets_sold: number;
  collected_from_buyers: number;
  commission_earned: number;
  amount_due_admin: number;
  prize_amount?: number;
  winning_number?: string | null;
  has_winner?: boolean;
  is_my_win?: boolean;
  ticket_number?: string | null;
  buyer_name?: string | null;
  buyer_contact?: string | null;
  public_id?: string | null;
}

interface SettlementPayload {
  selected_round_id: string | null;
  current: SettlementCurrent | null;
  rounds: RoundSettlement[];
}

export function AgentSettlementSummary({
  compact = false,
  defaultRoundId,
  showWinnerOnMyWin = false,
}: {
  compact?: boolean;
  defaultRoundId?: string | null;
  /** When true and this agent sold the winning ticket, show buyer + prize payout block */
  showWinnerOnMyWin?: boolean;
}) {
  const supabase = createClient();
  const { refreshKey } = useAgentRefresh();
  const { locale } = useLocale();
  const t = useT();
  const [roundId, setRoundId] = useState<string | null>(defaultRoundId ?? null);

  useEffect(() => {
    if (defaultRoundId) setRoundId(defaultRoundId);
  }, [defaultRoundId]);

  const fetchSettlement = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_agent_settlement", {
      p_round_id: roundId,
    });
    if (error) throw error;
    return data as SettlementPayload;
  }, [supabase, roundId]);

  const { data, loading, error } = useAsyncData(fetchSettlement, [roundId, refreshKey]);

  const rounds = data?.rounds ?? [];
  const current = useMemo((): SettlementCurrent | null => {
    if (!data?.current) return null;
    const c = data.current;
    return {
      ...c,
      tickets_sold: Number(c.tickets_sold),
      collected_from_buyers: Number(c.collected_from_buyers),
      commission_earned: Number(c.commission_earned),
      amount_due_admin: Number(c.amount_due_admin),
      ticket_price: Number(c.ticket_price),
      prize_amount: c.prize_amount != null ? Number(c.prize_amount) : undefined,
    };
  }, [data?.current]);

  const roundDrawn = current?.round_status === "drawn";
  const showWinnerBlock =
    showWinnerOnMyWin && roundDrawn && current?.is_my_win && current?.buyer_name;
  const showNoWinnerForAgent =
    showWinnerOnMyWin && roundDrawn && !current?.is_my_win;

  const activeRoundId = roundId ?? data?.selected_round_id ?? rounds[0]?.id ?? null;

  if (error) {
    return (
      <Alert color="danger" variant="soft" sx={{ mb: 2 }}>
        {error}
        <Typography level="body-xs" sx={{ mt: 0.5 }}>
          {t("agent.summary.migrationHint15")}
        </Typography>
      </Alert>
    );
  }

  if (loading && !current) {
    return (
      <Card variant="soft" sx={{ mb: 2, p: 2 }}>
        <Typography level="body-sm">{t("agent.summary.loading")}</Typography>
      </Card>
    );
  }

  if (!current && rounds.length === 0) {
    return null;
  }

  const due = current?.amount_due_admin ?? 0;
  const tickets = current?.tickets_sold ?? 0;
  const ticketUnit = tickets === 1 ? t("common.ticket") : t("common.tickets");

  if (compact) {
    return (
      <Card
        variant="outlined"
        sx={{
          mb: 2,
          p: 2,
          borderColor: due > 0 ? "primary.300" : "neutral.300",
          bgcolor: due > 0 ? "primary.50" : "background.surface",
        }}
      >
        <Stack spacing={1.5}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", sm: "flex-start" }}
            spacing={1}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography level="body-xs" sx={{ color: "text.tertiary", mb: 0.25 }}>
                {t("agent.summary.thisRound", { name: current?.round_name ?? "—" })}
              </Typography>
              <Typography level="body-sm" sx={{ color: "text.secondary" }}>
                {t("agent.summary.collected")}: {formatMoneyDisplay(current?.collected_from_buyers ?? 0)}
              </Typography>
              <Typography level="title-md" fontWeight={700} sx={{ mt: 0.5 }}>
                {t("agent.summary.dueAdmin", { amount: formatMoneyDisplay(due) })}
              </Typography>
              <Typography level="body-xs" sx={{ color: "text.tertiary", mt: 0.25 }}>
                {t("agent.summary.ticketsCommission", {
                  count: tickets,
                  unit: ticketUnit,
                  commission: formatMoneyDisplay(current?.commission_earned ?? 0),
                })}
              </Typography>
            </Box>
            <Chip
              size="sm"
              variant="soft"
              color={current?.round_status === "open" ? "success" : "neutral"}
            >
              {current?.round_status ?? "—"}
            </Chip>
          </Stack>
          {showWinnerBlock && current && <WinnerPayoutBlock current={current} t={t} />}
          {showNoWinnerForAgent && current && (
            <NoWinnerForAgentBlock current={current} t={t} />
          )}
        </Stack>
      </Card>
    );
  }

  return (
    <Card variant="outlined" sx={{ mb: 3, p: { xs: 2, sm: 2.5 }, borderColor: "primary.200" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography level="title-md">{t("agent.summary.title")}</Typography>
          <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
            {t("agent.summary.subtitle")}
          </Typography>
        </Box>
        {rounds.length > 0 && (
          <Select
            size="sm"
            value={activeRoundId ?? ""}
            onChange={(_, v) => setRoundId(v || null)}
            sx={{ width: { xs: "100%", sm: "auto" }, minWidth: { sm: 180 } }}
          >
            {rounds.map((r) => (
              <Option key={r.id} value={r.id}>
                {r.name} ({r.status})
              </Option>
            ))}
          </Select>
        )}
      </Stack>

      {current && (
        <>
          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
            <Chip size="sm" variant="soft">
              {t("agent.summary.perTicket", { price: formatMoneyDisplay(current.ticket_price) })}
            </Chip>
            <Chip size="sm" variant="outlined">
              {t("common.draw")} {formatDisplayDateTime(current.closes_at, locale)}
            </Chip>
          </Stack>

          <Grid container spacing={1.5}>
            <Grid xs={12} sm={6} md={3}>
              <Stat label={t("agent.summary.ticketsSold")} value={String(tickets)} />
            </Grid>
            <Grid xs={12} sm={6} md={3}>
              <Stat
                label={t("agent.summary.collected")}
                value={formatMoneyDisplay(current.collected_from_buyers)}
              />
            </Grid>
            <Grid xs={12} sm={6} md={3}>
              <Stat
                label={t("agent.summary.commission")}
                value={formatMoneyDisplay(current.commission_earned)}
                sub={t("agent.summary.commissionSub")}
              />
            </Grid>
            <Grid xs={12} sm={6} md={3}>
              <Stat
                label={t("agent.summary.due")}
                value={formatMoneyDisplay(due)}
                highlight
                sub={t("agent.summary.dueSub")}
              />
            </Grid>
          </Grid>

          <Alert color="primary" variant="soft" sx={{ mt: 2 }}>
            <Typography level="body-sm">
              {t("agent.summary.banner", {
                collected: formatMoneyDisplay(current.collected_from_buyers),
                commission: formatMoneyDisplay(current.commission_earned),
                due: formatMoneyDisplay(due),
                round: current.round_name,
              })}
            </Typography>
          </Alert>

          {showWinnerBlock && <WinnerPayoutBlock current={current} t={t} />}
          {showNoWinnerForAgent && <NoWinnerForAgentBlock current={current} t={t} />}
        </>
      )}
    </Card>
  );
}

function NoWinnerForAgentBlock({
  current,
  t,
}: {
  current: SettlementCurrent;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const hasRoundWinner = Boolean(current.has_winner);
  return (
    <Alert color="neutral" variant="soft" sx={{ mt: 2 }}>
      <Typography level="title-sm" fontWeight={600}>
        {t("agent.summary.noWinnerForYouTitle")}
      </Typography>
      <Typography level="body-sm" sx={{ mt: 0.5 }}>
        {hasRoundWinner
          ? t("agent.summary.noWinnerForYouOther", {
              number: current.winning_number ?? "—",
            })
          : t("agent.summary.noWinnerForYouRound")}
      </Typography>
    </Alert>
  );
}

function WinnerPayoutBlock({
  current,
  t,
}: {
  current: SettlementCurrent;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: "md",
        border: "2px solid",
        borderColor: "warning.400",
        bgcolor: "warning.50",
      }}
    >
      <Chip color="success" variant="soft" size="sm" sx={{ mb: 1.5 }}>
        {t("agent.summary.winnerSoldByYou")}
      </Chip>
      <Typography level="body-xs" sx={{ color: "text.tertiary", mb: 1 }}>
        {t("agent.summary.winnerIntro")}
      </Typography>
      <Stack spacing={0.75}>
        {current.winning_number && (
          <SettlementLine
            label={t("agent.winners.number")}
            value={current.winning_number}
            mono
          />
        )}
        {current.ticket_number && (
          <SettlementLine label={t("agent.tickets.col.number")} value={current.ticket_number} mono />
        )}
        {current.buyer_name && (
          <SettlementLine label={t("agent.winners.buyer")} value={current.buyer_name} />
        )}
        {current.buyer_contact && (
          <SettlementLine
            label={t("agent.winners.contact")}
            value={current.buyer_contact}
            highlight
          />
        )}
        {current.public_id && (
          <SettlementLine label={t("agent.tickets.col.id")} value={current.public_id} />
        )}
      </Stack>
      {current.prize_amount != null && current.prize_amount > 0 && (
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: "1px dashed", borderColor: "warning.300" }}>
          <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
            {t("agent.summary.prizeToPay")}
          </Typography>
          <Typography level="h4" fontWeight={700} sx={{ color: "warning.800" }}>
            {formatMoneyDisplay(current.prize_amount)}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

function SettlementLine({
  label,
  value,
  highlight,
  mono,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
      <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
        {label}
      </Typography>
      <Typography
        level="body-sm"
        fontWeight={highlight ? 700 : 500}
        sx={{
          color: highlight ? "primary.700" : "text.primary",
          letterSpacing: mono ? "0.2em" : undefined,
          textAlign: "right",
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

function Stat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: "md",
        bgcolor: highlight ? "primary.100" : "background.level1",
        border: "1px solid",
        borderColor: highlight ? "primary.300" : "divider",
        height: "100%",
      }}
    >
      <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
        {label}
      </Typography>
      <Typography
        level={highlight ? "h4" : "title-lg"}
        fontWeight={700}
        sx={{ color: highlight ? "primary.800" : "text.primary", lineHeight: 1.2 }}
      >
        {value}
      </Typography>
      {sub && (
        <Typography level="body-xs" sx={{ color: "text.tertiary", mt: 0.25 }}>
          {sub}
        </Typography>
      )}
    </Box>
  );
}
