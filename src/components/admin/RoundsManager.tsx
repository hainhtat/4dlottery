"use client";

import { useCallback, useState } from "react";
import Typography from "@mui/joy/Typography";
import Button from "@mui/joy/Button";
import Table from "@mui/joy/Table";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import Stack from "@mui/joy/Stack";
import Chip from "@mui/joy/Chip";
import Alert from "@mui/joy/Alert";
import Box from "@mui/joy/Box";
import Card from "@mui/joy/Card";
import Grid from "@mui/joy/Grid";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";
import type { Round, RoundStatus } from "@/lib/types/database";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataCard } from "@/components/ui/DataCard";
import { PremiumModalDialog } from "@/components/ui/PremiumModalDialog";
import { AdminRoundSettlementModal } from "@/components/admin/AdminRoundSettlementModal";
import { one } from "@/lib/utils/supabase-relations";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { formatMoneyDisplay, parseMoneyInput, suggestPrizeAmount } from "@/lib/utils/money";
import { useLocale, useT } from "@/components/providers/LocaleProvider";
import { formatDisplayDateTime } from "@/lib/pdf/format-datetime";

const statusColors: Record<RoundStatus, "success" | "warning" | "neutral" | "primary"> = {
  draft: "neutral",
  open: "success",
  closed: "warning",
  drawn: "primary",
};

const datetimeSx = {
  "& input": {
    fontFamily: "inherit",
    fontSize: "0.95rem",
    padding: "10px 12px",
  },
};

type RoundWithWinner = Round & {
  tickets:
    | {
        number: string;
        buyer_name: string;
        buyer_contact: string;
        public_id: string;
        profiles: { display_name: string } | { display_name: string }[] | null;
      }
    | {
        number: string;
        buyer_name: string;
        buyer_contact: string;
        public_id: string;
        profiles: { display_name: string } | { display_name: string }[] | null;
      }[]
    | null;
};

export function RoundsManager() {
  const supabase = createClient();
  const t = useT();
  const { locale } = useLocale();
  const fetchRounds = useCallback(async () => {
    const { data, error } = await supabase
      .from("rounds")
      .select(
        `
        *,
        tickets!rounds_winner_ticket_fk (
          number, buyer_name, buyer_contact, public_id,
          profiles!tickets_agent_id_fkey ( display_name )
        )
      `
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as RoundWithWinner[];
  }, [supabase]);

  const { data: rounds, loading, error, refetch, setData } = useAsyncData(fetchRounds);

  const [open, setOpen] = useState(false);
  const [drawOpen, setDrawOpen] = useState<Round | null>(null);
  const [winnerOpen, setWinnerOpen] = useState<RoundWithWinner | null>(null);
  const [settlementRoundId, setSettlementRoundId] = useState<string | null>(null);
  const [settlementMeta, setSettlementMeta] = useState<{
    winningNumber: string;
    hasWinner: boolean;
  } | null>(null);
  const [winningNumber, setWinningNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    ticket_price: "",
    prize_amount: "",
    prize_margin: "15",
    opens_at: "",
    closes_at: "",
  });

  const ticketPriceNum = parseMoneyInput(form.ticket_price);
  const marginNum = parseFloat(form.prize_margin) || 15;
  const suggestedPrize =
    ticketPriceNum > 0 ? suggestPrizeAmount(ticketPriceNum, marginNum) : 0;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { data, error } = await supabase
      .from("rounds")
      .insert({
        ticket_price: parseMoneyInput(form.ticket_price),
        prize_amount: parseMoneyInput(form.prize_amount),
        opens_at: new Date(form.opens_at).toISOString(),
        closes_at: new Date(form.closes_at).toISOString(),
        status: "draft",
      })
      .select()
      .single();
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Created ${(data as Round).name}`);
    setOpen(false);
    setForm({ ticket_price: "", prize_amount: "", prize_margin: "15", opens_at: "", closes_at: "" });
    if (data) setData((prev) => [{ ...(data as Round), tickets: null }, ...(prev ?? [])]);
    else refetch();
  }

  async function setStatus(id: string, status: RoundStatus) {
    if (status !== "open" && status !== "closed") {
      toast.error(t("admin.rounds.statusChangeInvalid"));
      return;
    }

    const { error } = await supabase.rpc("set_round_status", {
      p_round_id: id,
      p_status: status,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Round ${status}`);
    setData((prev) =>
      (prev ?? []).map((r) => (r.id === id ? { ...r, status } : r))
    );
  }

  async function handleDraw(e: React.FormEvent) {
    e.preventDefault();
    if (!drawOpen) return;
    setSubmitting(true);
    const num = winningNumber.padStart(4, "0");
    const { data, error } = await supabase.rpc("draw_round", {
      p_round_id: drawOpen.id,
      p_winning_number: num,
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    const result = data as { has_winner: boolean };
    const roundId = drawOpen.id;
    toast.success(
      result.has_winner ? t("admin.rounds.drawWinnerToast") : t("admin.rounds.drawNoWinnerToast")
    );
    setDrawOpen(null);
    setWinningNumber("");
    setSettlementRoundId(roundId);
    setSettlementMeta({ winningNumber: num, hasWinner: result.has_winner });
    refetch();
  }

  const list = rounds ?? [];

  const nextRoundLabel =
    list.length === 0
      ? "Round 1"
      : `Round ${
          Math.max(
            0,
            ...list.map((r) => {
              const m = /^Round (\d+)$/.exec(r.name);
              return m ? parseInt(m[1], 10) : 0;
            })
          ) + 1
        }`;

  return (
    <>
      <PageHeader
        title={t("admin.rounds.title")}
        description={t("admin.rounds.description")}
        action={
          <Button onClick={() => setOpen(true)}>{t("admin.rounds.new")}</Button>
        }
      />

      <Alert color="neutral" variant="soft" sx={{ mb: 2 }}>
        {t("admin.rounds.hint")}
      </Alert>

      {error && (
        <Alert color="danger" variant="soft" sx={{ mb: 2 }}>
          {t("admin.rounds.loadError", { error })}
        </Alert>
      )}

      <DataCard
        loading={loading}
        empty={!loading && !error && list.length === 0}
        emptyMessage={t("admin.rounds.empty")}
      >
        <Stack spacing={1.5} sx={{ display: { xs: "flex", md: "none" } }}>
          {list.map((r) => (
            <Card key={r.id} variant="outlined" sx={{ p: 2 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
                spacing={1}
                sx={{ mb: 1.5 }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography fontWeight="lg">{r.name}</Typography>
                  {r.status === "drawn" && r.winning_number && (
                    <Typography level="body-xs" sx={{ color: "primary.600", mt: 0.25 }}>
                      {t("admin.rounds.won", { number: r.winning_number })}
                    </Typography>
                  )}
                </Box>
                <Chip size="sm" variant="soft" color={statusColors[r.status]} sx={{ flexShrink: 0 }}>
                  {r.status}
                </Chip>
              </Stack>

              <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                <Grid xs={6}>
                  <RoundMeta
                    label={t("admin.rounds.col.price")}
                    value={formatMoneyDisplay(Number(r.ticket_price))}
                  />
                </Grid>
                <Grid xs={6}>
                  <RoundMeta
                    label={t("admin.rounds.col.prize")}
                    value={formatMoneyDisplay(Number(r.prize_amount))}
                  />
                </Grid>
              </Grid>

              <Typography level="body-xs" sx={{ color: "text.tertiary", lineHeight: 1.45 }}>
                {formatDisplayDateTime(r.opens_at, locale)}
                <br />
                {formatDisplayDateTime(r.closes_at, locale)}
              </Typography>

              <RoundActionButtons
                round={r}
                layout="stack"
                t={t}
                onSetStatus={setStatus}
                onDraw={setDrawOpen}
                onPayments={(round) => {
                  setSettlementRoundId(round.id);
                  setSettlementMeta({
                    winningNumber: round.winning_number ?? "",
                    hasWinner: !!round.winner_ticket_id,
                  });
                }}
                onWinner={setWinnerOpen}
              />
            </Card>
          ))}
        </Stack>

        <Box sx={{ display: { xs: "none", md: "block" }, overflowX: "auto" }}>
          <Table
            hoverRow
            stickyHeader
            sx={{
              "& thead th": {
                bgcolor: "background.level1",
                fontWeight: 600,
              },
            }}
          >
            <thead>
              <tr>
                <th>{t("admin.rounds.col.name")}</th>
                <th>{t("admin.rounds.col.price")}</th>
                <th>{t("admin.rounds.col.prize")}</th>
                <th>{t("admin.rounds.col.status")}</th>
                <th>{t("admin.rounds.col.window")}</th>
                <th style={{ width: 220 }}>{t("admin.rounds.col.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Typography fontWeight="md">{r.name}</Typography>
                    {r.status === "drawn" && r.winning_number && (
                      <Typography level="body-xs" sx={{ color: "primary.600" }}>
                        {t("admin.rounds.won", { number: r.winning_number })}
                      </Typography>
                    )}
                  </td>
                  <td>{formatMoneyDisplay(Number(r.ticket_price))}</td>
                  <td>{formatMoneyDisplay(Number(r.prize_amount))}</td>
                  <td>
                    <Chip size="sm" variant="soft" color={statusColors[r.status]}>
                      {r.status}
                    </Chip>
                  </td>
                  <td>
                    <Typography level="body-xs">
                      {formatDisplayDateTime(r.opens_at, locale)} –{" "}
                      {formatDisplayDateTime(r.closes_at, locale)}
                    </Typography>
                  </td>
                  <td>
                    <RoundActionButtons
                      round={r}
                      layout="row"
                      t={t}
                      onSetStatus={setStatus}
                      onDraw={setDrawOpen}
                      onPayments={(round) => {
                        setSettlementRoundId(round.id);
                        setSettlementMeta({
                          winningNumber: round.winning_number ?? "",
                          hasWinner: !!round.winner_ticket_id,
                        });
                      }}
                      onWinner={setWinnerOpen}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Box>
      </DataCard>

      <PremiumModalDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("admin.rounds.createTitle")}
        subtitle={t("admin.rounds.createSubtitle")}
        maxWidth={480}
      >
        <form onSubmit={handleCreate}>
          <Stack spacing={2}>
            <Alert color="primary" variant="soft">
              {t("admin.rounds.autoName", { name: nextRoundLabel })}
            </Alert>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <FormControl sx={{ flex: 1 }}>
                <FormLabel>Ticket price</FormLabel>
                <MoneyInput
                  required
                  placeholder="1,000"
                  value={form.ticket_price}
                  onValueChange={(ticket_price) => setForm({ ...form, ticket_price })}
                />
              </FormControl>
              <FormControl sx={{ flex: 1 }}>
                <FormLabel>Admin margin % (prize guide)</FormLabel>
                <Input
                  type="number"
                  slotProps={{ input: { min: 0, max: 50, step: 1 } }}
                  value={form.prize_margin}
                  onChange={(e) => setForm({ ...form, prize_margin: e.target.value })}
                />
              </FormControl>
            </Stack>
            <FormControl>
              <FormLabel>Grand prize amount</FormLabel>
              <MoneyInput
                required
                placeholder="850,000"
                value={form.prize_amount}
                onValueChange={(prize_amount) => setForm({ ...form, prize_amount })}
              />
              {suggestedPrize > 0 && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                  <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                    Suggested (10k tickets, {marginNum}% margin):{" "}
                    <strong>{formatMoneyDisplay(suggestedPrize)}</strong>
                  </Typography>
                  <Button
                    size="sm"
                    variant="soft"
                    type="button"
                    onClick={() =>
                      setForm({ ...form, prize_amount: String(suggestedPrize) })
                    }
                  >
                    Use
                  </Button>
                </Stack>
              )}
            </FormControl>
            <FormControl>
              <FormLabel>Opens at</FormLabel>
              <Input
                type="datetime-local"
                required
                value={form.opens_at}
                onChange={(e) => setForm({ ...form, opens_at: e.target.value })}
                sx={datetimeSx}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Closes at (draw date)</FormLabel>
              <Input
                type="datetime-local"
                required
                value={form.closes_at}
                onChange={(e) => setForm({ ...form, closes_at: e.target.value })}
                sx={datetimeSx}
              />
            </FormControl>
            <Button type="submit" loading={submitting} size="lg">
              {t("admin.rounds.create")}
            </Button>
          </Stack>
        </form>
      </PremiumModalDialog>

      <PremiumModalDialog
        open={!!drawOpen}
        onClose={() => setDrawOpen(null)}
        title={drawOpen ? t("admin.rounds.drawTitle", { name: drawOpen.name }) : t("admin.rounds.draw")}
        subtitle={t("admin.rounds.drawSubtitle")}
        maxWidth={400}
      >
        <form onSubmit={handleDraw}>
          <FormControl>
            <FormLabel>{t("admin.rounds.lastFour")}</FormLabel>
            <Input
              required
              placeholder="0000"
              slotProps={{ input: { maxLength: 4, style: { letterSpacing: "0.35em", textAlign: "center", fontWeight: 700 } } }}
              value={winningNumber}
              onChange={(e) => setWinningNumber(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </FormControl>
          <Button type="submit" loading={submitting} size="lg" sx={{ mt: 2 }} fullWidth>
            {t("admin.rounds.announce")}
          </Button>
        </form>
      </PremiumModalDialog>

      <PremiumModalDialog
        open={!!winnerOpen}
        onClose={() => setWinnerOpen(null)}
        title={winnerOpen ? t("admin.rounds.winnerTitle", { name: winnerOpen.name }) : t("admin.rounds.winner")}
        subtitle={t("admin.rounds.winnerSubtitle")}
        maxWidth={460}
      >
        {winnerOpen && (() => {
          const ticket = one(winnerOpen.tickets);
          const agent = ticket ? one(ticket.profiles) : null;
          if (!ticket) {
            return (
              <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
                {t("admin.rounds.noWinnerSold", { number: winnerOpen.winning_number ?? "" })}
              </Typography>
            );
          }
          return (
            <Stack spacing={1.5}>
              <Box
                sx={{
                  textAlign: "center",
                  py: 2,
                  borderRadius: "lg",
                  bgcolor: "background.level1",
                  border: "1px solid",
                  borderColor: "primary.200",
                }}
              >
                <Typography level="body-xs" sx={{ color: "text.tertiary", letterSpacing: "0.15em" }}>
                  {t("admin.rounds.winningNumber")}
                </Typography>
                <Typography level="h2" sx={{ letterSpacing: "0.3em", fontWeight: 700 }}>
                  {winnerOpen.winning_number}
                </Typography>
              </Box>
              <Detail label={t("admin.rounds.ticketId")} value={ticket.public_id} />
              <Detail label={t("admin.rounds.buyer")} value={ticket.buyer_name} />
              <Detail label={t("admin.rounds.contact")} value={ticket.buyer_contact} highlight />
              <Detail label={t("admin.rounds.sellingAgent")} value={agent?.display_name ?? "—"} />
              <Detail label={t("admin.rounds.prizeLabel")} value={Number(winnerOpen.prize_amount).toLocaleString()} />
            </Stack>
          );
        })()}
      </PremiumModalDialog>

      <AdminRoundSettlementModal
        open={!!settlementRoundId}
        onClose={() => {
          setSettlementRoundId(null);
          setSettlementMeta(null);
        }}
        roundId={settlementRoundId}
        winningNumber={settlementMeta?.winningNumber}
        hasWinner={settlementMeta?.hasWinner}
      />
    </>
  );
}

function RoundMeta({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography level="body-xs" sx={{ color: "text.tertiary", mb: 0.25 }}>
        {label}
      </Typography>
      <Typography level="body-md" fontWeight={600}>
        {value}
      </Typography>
    </Box>
  );
}

function RoundActionButtons({
  round: r,
  layout,
  t,
  onSetStatus,
  onDraw,
  onPayments,
  onWinner,
}: {
  round: Round;
  layout: "row" | "stack";
  t: (key: string) => string;
  onSetStatus: (id: string, status: RoundStatus) => void;
  onDraw: (round: Round) => void;
  onPayments: (round: Round) => void;
  onWinner: (round: RoundWithWinner) => void;
}) {
  const fullWidth = layout === "stack";
  const stackSx = layout === "stack" ? { mt: 1.5 } : undefined;

  return (
    <Stack
      direction={layout === "stack" ? "column" : "row"}
      spacing={layout === "stack" ? 0.75 : 0.5}
      flexWrap={layout === "row" ? "wrap" : undefined}
      sx={stackSx}
    >
      {r.status === "draft" && (
        <Button size="sm" fullWidth={fullWidth} onClick={() => onSetStatus(r.id, "open")}>
          {t("admin.rounds.open")}
        </Button>
      )}
      {r.status === "open" && (
        <Button
          size="sm"
          color="warning"
          fullWidth={fullWidth}
          onClick={() => onSetStatus(r.id, "closed")}
        >
          {t("admin.rounds.close")}
        </Button>
      )}
      {r.status === "closed" && (
        <Button size="sm" color="primary" fullWidth={fullWidth} onClick={() => onDraw(r)}>
          {t("admin.rounds.draw")}
        </Button>
      )}
      {r.status === "drawn" && (
        <Button
          size="sm"
          variant="soft"
          color="primary"
          fullWidth={fullWidth}
          onClick={() => onPayments(r)}
        >
          {t("admin.rounds.payments")}
        </Button>
      )}
      {r.status === "drawn" && r.winner_ticket_id && (
        <Button
          size="sm"
          variant="outlined"
          fullWidth={fullWidth}
          onClick={() => onWinner(r as RoundWithWinner)}
        >
          {t("admin.rounds.winner")}
        </Button>
      )}
    </Stack>
  );
}

function Detail({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
        {label}
      </Typography>
      <Typography level="body-md" fontWeight={highlight ? 700 : 500} sx={{ color: highlight ? "primary.700" : undefined }}>
        {value}
      </Typography>
    </Stack>
  );
}
