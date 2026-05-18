"use client";

import { useCallback } from "react";
import Typography from "@mui/joy/Typography";
import Card from "@mui/joy/Card";
import Stack from "@mui/joy/Stack";
import Chip from "@mui/joy/Chip";
import Alert from "@mui/joy/Alert";
import Box from "@mui/joy/Box";
import Divider from "@mui/joy/Divider";
import { createClient } from "@/lib/supabase/client";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDisplayDateTime } from "@/lib/pdf/format-datetime";
import { useLocale, useT } from "@/components/providers/LocaleProvider";
import { useAgentRefresh } from "@/components/agent/AgentRefreshContext";

interface RoundResult {
  round_id: string;
  round_name: string;
  winning_number: string | null;
  prize_amount: number;
  closes_at: string;
  has_winner: boolean;
  is_my_win: boolean;
  ticket_number: string | null;
  buyer_name: string | null;
  buyer_contact: string | null;
  public_id: string | null;
}

export function AgentWinnersList() {
  const supabase = createClient();
  const t = useT();
  const { locale } = useLocale();
  const { refreshKey } = useAgentRefresh();

  const fetchResults = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_agent_round_results");
    if (error) throw error;
    return (data ?? []) as RoundResult[];
  }, [supabase]);

  const { data: rounds, loading, error } = useAsyncData(fetchResults, [refreshKey]);
  const list = rounds ?? [];
  const myWins = list.filter((r) => r.is_my_win);

  return (
    <>
      <PageHeader title={t("agent.winners.title")} description={t("agent.winners.description")} />

      {error && (
        <Alert color="danger" sx={{ mb: 2 }}>
          {error}
          <Typography level="body-xs" sx={{ mt: 0.5 }}>
            {t("agent.winners.migrationHint")}
          </Typography>
        </Alert>
      )}

      {loading && (
        <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
          {t("common.loading")}
        </Typography>
      )}

      {!loading && list.length === 0 && (
        <Card variant="soft" sx={{ p: 4, textAlign: "center" }}>
          <Typography level="title-md" sx={{ mb: 1 }}>
            {t("agent.winners.noDraws")}
          </Typography>
          <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
            {t("agent.winners.noDrawsHint")}
          </Typography>
        </Card>
      )}

      <Stack spacing={2}>
        {list.map((r) => (
          <Card
            key={r.round_id}
            variant="outlined"
            sx={{
              p: 2.5,
              borderColor: r.is_my_win ? "primary.300" : "neutral.300",
              background: r.is_my_win
                ? "linear-gradient(135deg, rgba(201,162,39,0.1) 0%, transparent 60%)"
                : undefined,
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
              sx={{ mb: 1.5 }}
            >
              <Box>
                <Typography level="title-lg" fontWeight={700}>
                  {r.round_name}
                </Typography>
                <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                  {t("common.draw")} {formatDisplayDateTime(r.closes_at, locale)}
                </Typography>
              </Box>
              {r.winning_number && (
                <Chip color="primary" variant="soft" size="lg">
                  {r.winning_number}
                </Chip>
              )}
            </Stack>

            {!r.has_winner && (
              <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
                No winning ticket was sold for this round.
              </Typography>
            )}

            {r.has_winner && !r.is_my_win && (
              <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
                Winning ticket sold by another agent. Prize:{" "}
                {Number(r.prize_amount).toLocaleString()}
              </Typography>
            )}

            {r.is_my_win && r.buyer_name && (
              <>
                <Chip color="success" variant="soft" size="sm" sx={{ mb: 1.5 }}>
                  You sold the winner
                </Chip>
                <Divider sx={{ my: 1.5 }} />
                <Stack spacing={1}>
                  <WinnerLine label={t("agent.tickets.col.id")} value={r.public_id!} />
                  <WinnerLine label={t("agent.winners.number")} value={r.ticket_number!} mono />
                  <WinnerLine label={t("agent.winners.buyer")} value={r.buyer_name} />
                  <WinnerLine label={t("agent.winners.contact")} value={r.buyer_contact!} highlight />
                  <WinnerLine
                    label={t("agent.winners.prize")}
                    value={Number(r.prize_amount).toLocaleString()}
                  />
                </Stack>
              </>
            )}
          </Card>
        ))}
      </Stack>

      {!loading && list.length > 0 && myWins.length === 0 && (
        <Alert color="neutral" variant="soft" sx={{ mt: 2 }}>
          You have not sold a winning ticket yet. Keep selling — your buyer contact will show on
          the matching round card.
        </Alert>
      )}
    </>
  );
}

function WinnerLine({
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
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
        {label}
      </Typography>
      <Typography
        level="body-md"
        fontWeight={highlight ? 700 : 500}
        sx={{
          color: highlight ? "primary.700" : "text.primary",
          letterSpacing: mono ? "0.2em" : undefined,
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}
