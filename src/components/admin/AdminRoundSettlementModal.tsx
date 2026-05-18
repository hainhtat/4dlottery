"use client";

import { useCallback, useEffect, useState } from "react";
import Typography from "@mui/joy/Typography";
import Table from "@mui/joy/Table";
import Sheet from "@mui/joy/Sheet";
import Stack from "@mui/joy/Stack";
import Box from "@mui/joy/Box";
import Chip from "@mui/joy/Chip";
import Alert from "@mui/joy/Alert";
import CircularProgress from "@mui/joy/CircularProgress";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import { createClient } from "@/lib/supabase/client";
import { PremiumModalDialog } from "@/components/ui/PremiumModalDialog";
import { formatMoneyDisplay } from "@/lib/utils/money";
import { useT } from "@/components/providers/LocaleProvider";
import type { AdminRoundSettlementPayload } from "@/lib/admin/round-settlement-types";

const gold = "#c9a227";
const moneySx = { fontVariantNumeric: "tabular-nums" as const };

export function AdminRoundSettlementModal({
  open,
  onClose,
  roundId,
  winningNumber,
  hasWinner,
}: {
  open: boolean;
  onClose: () => void;
  roundId: string | null;
  winningNumber?: string;
  hasWinner?: boolean;
}) {
  const supabase = createClient();
  const t = useT();
  const [data, setData] = useState<AdminRoundSettlementPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!roundId) return;
    setLoading(true);
    setError(null);
    const { data: payload, error: rpcError } = await supabase.rpc("get_round_agent_settlement", {
      p_round_id: roundId,
    });
    setLoading(false);
    if (rpcError) {
      setError(rpcError.message);
      setData(null);
      return;
    }
    setData(payload as AdminRoundSettlementPayload);
  }, [supabase, roundId]);

  useEffect(() => {
    if (open && roundId) void load();
    if (!open) {
      setData(null);
      setError(null);
    }
  }, [open, roundId, load]);

  const round = data?.round;
  const agents = data?.agents ?? [];
  const totals = data?.totals;
  const displayWinning = winningNumber ?? round?.winning_number ?? "—";
  const roundHasWinner = hasWinner ?? round?.has_winner ?? false;

  const totalCollect = totals ? Number(totals.amount_due) : 0;
  const totalPrize = totals ? Number(totals.prize_payout ?? 0) : 0;
  const netCollect = totals ? Number(totals.net_collect ?? totalCollect - totalPrize) : 0;
  const netPositive = netCollect >= 0;

  const subtitle = round ? t("admin.drawSettlement.subtitleRound", { name: round.name }) : undefined;

  return (
    <PremiumModalDialog
      open={open}
      onClose={onClose}
      title={t("admin.drawSettlement.title")}
      subtitle={subtitle}
      maxWidth={680}
      bodyPadding={false}
    >
      {loading && (
        <Stack alignItems="center" sx={{ py: 6, px: 3 }}>
          <CircularProgress size="md" />
          <Typography level="body-sm" sx={{ mt: 1.5, color: "text.tertiary" }}>
            {t("admin.drawSettlement.loading")}
          </Typography>
        </Stack>
      )}

      {error && (
        <Box sx={{ p: 2.5 }}>
          <Alert color="danger">
            {error}
            <Typography level="body-xs" sx={{ mt: 0.5 }}>
              {t("admin.drawSettlement.migrationHint")}
            </Typography>
          </Alert>
        </Box>
      )}

      {!loading && !error && data && (
        <>
          <Box
            sx={{
              px: { xs: 2, sm: 3 },
              py: 2,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.5,
              borderBottom: "1px solid",
              borderColor: "divider",
              bgcolor: "background.surface",
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  px: 1.5,
                  py: 0.75,
                  borderRadius: "md",
                  border: `1px solid ${gold}`,
                  bgcolor: "neutral.900",
                }}
              >
                <Typography
                  level="body-xs"
                  sx={{ color: "neutral.400", letterSpacing: "0.08em", mb: 0.25 }}
                >
                  {t("admin.rounds.winningNumber")}
                </Typography>
                <Typography
                  level="h3"
                  sx={{ color: gold, letterSpacing: "0.28em", fontWeight: 700, ...moneySx }}
                >
                  {displayWinning}
                </Typography>
              </Box>
              <Chip
                size="sm"
                variant="soft"
                color={roundHasWinner ? "success" : "neutral"}
                startDecorator={roundHasWinner ? <EmojiEventsRoundedIcon /> : undefined}
              >
                {roundHasWinner
                  ? t("admin.drawSettlement.hasWinner")
                  : t("admin.drawSettlement.noWinner")}
              </Chip>
            </Stack>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
              gap: 0,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <SummaryMetric
              label={t("admin.drawSettlement.totalCollect")}
              value={formatMoneyDisplay(totalCollect)}
            />
            <SummaryMetric
              label={t("admin.drawSettlement.totalPrize")}
              value={formatMoneyDisplay(totalPrize)}
              accent={totalPrize > 0 ? "warning" : undefined}
              bordered
            />
            <SummaryMetric
              label={t("admin.drawSettlement.netPosition")}
              value={formatMoneyDisplay(netCollect)}
              sub={
                netPositive
                  ? t("admin.drawSettlement.netIn")
                  : t("admin.drawSettlement.netOut")
              }
              accent={netPositive ? "primary" : "danger"}
              bordered
            />
          </Box>

          {roundHasWinner && round?.winner_agent_name && (
            <Box sx={{ px: { xs: 2, sm: 3 }, py: 2, bgcolor: "background.level1" }}>
              <Typography
                level="body-xs"
                sx={{
                  color: "text.tertiary",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  mb: 1.5,
                }}
              >
                {t("admin.drawSettlement.winnerBlockTitle")}
              </Typography>
              <Sheet
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: "lg",
                  borderLeft: `3px solid ${gold}`,
                  bgcolor: "background.surface",
                }}
              >
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: { xs: 1.25, sm: 2 },
                  }}
                >
                  <DetailItem label={t("admin.dashboard.col.agent")} value={round.winner_agent_name} />
                  {round.winner_ticket_number && (
                    <DetailItem
                      label={t("admin.rounds.winningNumber")}
                      value={round.winner_ticket_number}
                      mono
                    />
                  )}
                  {round.winner_buyer_name && (
                    <DetailItem label={t("admin.rounds.buyer")} value={round.winner_buyer_name} />
                  )}
                  {round.winner_buyer_contact && (
                    <DetailItem
                      label={t("admin.rounds.contact")}
                      value={round.winner_buyer_contact}
                    />
                  )}
                </Box>
                <Box
                  sx={{
                    mt: 2,
                    pt: 2,
                    borderTop: "1px solid",
                    borderColor: "divider",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    flexWrap: "wrap",
                    gap: 1,
                  }}
                >
                  <Typography level="body-sm" sx={{ color: "text.secondary" }}>
                    {t("admin.drawSettlement.prizeOwed")}
                  </Typography>
                  <Typography level="h3" fontWeight={700} sx={{ color: "warning.700", ...moneySx }}>
                    {formatMoneyDisplay(Number(round.prize_amount))}
                  </Typography>
                </Box>
              </Sheet>
            </Box>
          )}

          <Box sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
            <Typography level="title-sm" sx={{ mb: 1.5 }}>
              {t("admin.drawSettlement.perAgent")}
            </Typography>

            {agents.length === 0 ? (
              <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
                {t("admin.dashboard.noSales")}
              </Typography>
            ) : (
              <Sheet variant="outlined" sx={{ borderRadius: "lg", overflow: "hidden" }}>
                <Box sx={{ overflowX: "auto" }}>
                  <Table
                    size="sm"
                    sx={{
                      "--TableCell-headBackground": "var(--joy-palette-background-level1)",
                      "& th": { fontWeight: 600, fontSize: "0.75rem", color: "text.tertiary" },
                      "& th:not(:first-of-type)": { textAlign: "right" },
                      "& td:not(:first-of-type)": { textAlign: "right" },
                      "& tfoot td": { bgcolor: "background.level1", borderTop: "2px solid", borderColor: "divider" },
                    }}
                  >
                    <thead>
                      <tr>
                        <th>{t("admin.dashboard.col.agent")}</th>
                        <th>{t("admin.dashboard.col.tickets")}</th>
                        <th>{t("admin.drawSettlement.collect")}</th>
                        <th>{t("admin.drawSettlement.pay")}</th>
                        <th>{t("admin.drawSettlement.net")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agents.map((a) => {
                        const collect = Number(a.amount_due);
                        const pay = Number(a.prize_to_pay ?? 0);
                        const net = collect - pay;
                        return (
                          <tr key={a.agent_id}>
                            <td>
                              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                                <Typography level="body-sm" fontWeight={600}>
                                  {a.display_name}
                                </Typography>
                                {a.is_winner_agent && (
                                  <Chip size="sm" variant="soft" color="warning">
                                    {t("admin.drawSettlement.winnerAgent")}
                                  </Chip>
                                )}
                              </Stack>
                            </td>
                            <td>
                              <Typography level="body-sm" sx={moneySx}>
                                {a.tickets_sold}
                              </Typography>
                            </td>
                            <td>
                              <Typography level="body-sm" sx={moneySx}>
                                {formatMoneyDisplay(collect)}
                              </Typography>
                            </td>
                            <td>
                              {pay > 0 ? (
                                <Typography level="body-sm" fontWeight={600} sx={{ color: "warning.700", ...moneySx }}>
                                  {formatMoneyDisplay(pay)}
                                </Typography>
                              ) : (
                                <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
                                  —
                                </Typography>
                              )}
                            </td>
                            <td>
                              <Typography
                                level="body-sm"
                                fontWeight={700}
                                sx={{
                                  color: net >= 0 ? "primary.700" : "danger.600",
                                  ...moneySx,
                                }}
                              >
                                {formatMoneyDisplay(net)}
                              </Typography>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {totals && agents.length > 0 && (
                      <tfoot>
                        <tr>
                          <td>
                            <Typography level="body-sm" fontWeight={700}>
                              {t("admin.dashboard.total")}
                            </Typography>
                          </td>
                          <td>
                            <Typography level="body-sm" fontWeight={700} sx={moneySx}>
                              {totals.tickets_sold}
                            </Typography>
                          </td>
                          <td>
                            <Typography level="body-sm" fontWeight={700} sx={moneySx}>
                              {formatMoneyDisplay(totalCollect)}
                            </Typography>
                          </td>
                          <td>
                            <Typography level="body-sm" fontWeight={700} sx={{ color: "warning.700", ...moneySx }}>
                              {totalPrize > 0 ? formatMoneyDisplay(totalPrize) : "—"}
                            </Typography>
                          </td>
                          <td>
                            <Typography
                              level="body-sm"
                              fontWeight={700}
                              sx={{
                                color: netPositive ? "primary.700" : "danger.600",
                                ...moneySx,
                              }}
                            >
                              {formatMoneyDisplay(netCollect)}
                            </Typography>
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </Table>
                </Box>
              </Sheet>
            )}
          </Box>

          <Box
            sx={{
              px: { xs: 2, sm: 3 },
              py: 1.75,
              pb: { xs: 2.5, sm: 1.75 },
              borderTop: "1px solid",
              borderColor: "divider",
              bgcolor: "background.level1",
            }}
          >
            <Typography level="body-xs" sx={{ color: "text.tertiary", lineHeight: 1.5 }}>
              {t("admin.drawSettlement.footnote")}
            </Typography>
          </Box>
        </>
      )}
    </PremiumModalDialog>
  );
}

function SummaryMetric({
  label,
  value,
  sub,
  accent,
  bordered,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "primary" | "warning" | "danger";
  bordered?: boolean;
}) {
  const valueColor =
    accent === "danger"
      ? "danger.700"
      : accent === "warning"
        ? "warning.800"
        : accent === "primary"
          ? "primary.700"
          : "text.primary";

  return (
    <Box
      sx={{
        px: { xs: 2, sm: 2.5 },
        py: 2,
        borderLeft: bordered ? "1px solid" : undefined,
        borderColor: "divider",
      }}
    >
      <Typography level="body-xs" sx={{ color: "text.tertiary", mb: 0.5 }}>
        {label}
      </Typography>
      <Typography level="h3" fontWeight={700} sx={{ color: valueColor, lineHeight: 1.2, ...moneySx }}>
        {value}
      </Typography>
      {sub && (
        <Typography level="body-xs" sx={{ color: "text.tertiary", mt: 0.75 }}>
          {sub}
        </Typography>
      )}
    </Box>
  );
}

function DetailItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <Box>
      <Typography level="body-xs" sx={{ color: "text.tertiary", mb: 0.25 }}>
        {label}
      </Typography>
      <Typography
        level="body-md"
        fontWeight={500}
        sx={{ letterSpacing: mono ? "0.2em" : undefined }}
      >
        {value}
      </Typography>
    </Box>
  );
}
