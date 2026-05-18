"use client";

import { useCallback, useEffect, useState } from "react";
import Typography from "@mui/joy/Typography";
import Table from "@mui/joy/Table";
import Button from "@mui/joy/Button";
import Chip from "@mui/joy/Chip";
import Stack from "@mui/joy/Stack";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Box from "@mui/joy/Box";
import IconButton from "@mui/joy/IconButton";
import Tooltip from "@mui/joy/Tooltip";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import PhotoLibraryRoundedIcon from "@mui/icons-material/PhotoLibraryRounded";
import { downloadTicketPdf } from "@/lib/tickets/download-pdf";
import { saveTicketImagesWithToast } from "@/lib/tickets/save-ticket-images";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataCard } from "@/components/ui/DataCard";
import { one } from "@/lib/utils/supabase-relations";
import { ticketRoundDetail } from "@/lib/supabase/embeds";
import { formatDisplayDateTime } from "@/lib/pdf/format-datetime";
import { useLocale, useT } from "@/components/providers/LocaleProvider";
import { AgentTicketCard } from "@/components/agent/AgentTicketCard";
import { useAgentRefresh } from "@/components/agent/AgentRefreshContext";
import { fetchRoundContext, type RoundContext } from "@/lib/rounds/fetch-round-context";

const PAGE_SIZE = 50;

type RoundFilter = "current" | "all" | "previous";

interface TicketRow {
  id: string;
  public_id: string;
  number: string;
  buyer_name: string;
  status: string;
  issued_at: string;
  batch_id: string | null;
  commission_amount: number;
  round_id: string;
  rounds:
    | { id: string; name: string; status: string }
    | { id: string; name: string; status: string }[]
    | null;
}

type ListCursor = { issued_at: string; id: string };

export function AgentTicketsList() {
  const supabase = createClient();
  const { refreshKey } = useAgentRefresh();
  const t = useT();
  const { locale } = useLocale();
  const [roundFilter, setRoundFilter] = useState<RoundFilter>("current");
  const [roundContext, setRoundContext] = useState<RoundContext>({
    rounds: [],
    currentRoundId: null,
    currentRoundName: null,
  });
  const [roundsReady, setRoundsReady] = useState(false);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<ListCursor | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRoundsReady(false);

    fetchRoundContext(supabase)
      .then((ctx) => {
        if (!cancelled) {
          setRoundContext(ctx);
          setRoundsReady(true);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t("agent.tickets.loadFailed"));
          setRoundsReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [supabase, refreshKey, t]);

  const fetchPage = useCallback(
    async (opts: { append: boolean; after: ListCursor | null }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { rows: [] as TicketRow[], hasMore: false, nextCursor: null };
      }

      const { currentRoundId, currentRoundName } = roundContext;

      let query = supabase
        .from("tickets")
        .select(
          `id, public_id, number, buyer_name, status, issued_at, batch_id, commission_amount, round_id, ${ticketRoundDetail}`
        )
        .eq("agent_id", user.id)
        .order("issued_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(PAGE_SIZE + 1);

      if (roundFilter === "current" && currentRoundId) {
        query = query.eq("round_id", currentRoundId);
      } else if (roundFilter === "previous" && currentRoundId) {
        query = query.neq("round_id", currentRoundId);
      }

      if (opts.after) {
        const ts = encodeURIComponent(opts.after.issued_at);
        const id = opts.after.id;
        query = query.or(`issued_at.lt.${ts},and(issued_at.eq.${ts},id.lt.${id})`);
      }

      const { data, error: ticketsError } = await query;
      if (ticketsError) throw ticketsError;

      const raw = (data ?? []) as TicketRow[];
      const pageHasMore = raw.length > PAGE_SIZE;
      const rows = pageHasMore ? raw.slice(0, PAGE_SIZE) : raw;
      const last = rows[rows.length - 1];

      return {
        rows,
        hasMore: pageHasMore,
        nextCursor: last ? { issued_at: last.issued_at, id: last.id } : null,
      };
    },
    [supabase, roundFilter, roundContext]
  );

  useEffect(() => {
    if (!roundsReady) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setCursor(null);

    fetchPage({ append: false, after: null })
      .then((result) => {
        if (cancelled) return;
        setTickets(result.rows);
        setHasMore(result.hasMore);
        setCursor(result.nextCursor ?? null);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load tickets");
          setTickets([]);
          setHasMore(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchPage, roundsReady, roundFilter]);

  async function loadMore() {
    if (!hasMore || loadingMore || !cursor) return;
    setLoadingMore(true);
    try {
      const result = await fetchPage({ append: true, after: cursor });
      setTickets((prev) => [...prev, ...result.rows]);
      setHasMore(result.hasMore);
      setCursor(result.nextCursor ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }

  const filterLabel =
    roundFilter === "current"
      ? roundContext.currentRoundName
        ? t("agent.tickets.filterLabelCurrent", { name: roundContext.currentRoundName })
        : t("agent.tickets.filterLabelCurrentGeneric")
      : roundFilter === "previous"
        ? t("agent.tickets.filterLabelPrevious")
        : t("agent.tickets.filterLabelAll");

  return (
    <>
      <PageHeader title={t("agent.tickets.title")} description={filterLabel} />

      <FormControl sx={{ mb: 2, width: "100%", maxWidth: { md: 280 } }}>
        <FormLabel>{t("agent.tickets.filter")}</FormLabel>
        <Select
          value={roundFilter}
          onChange={(_, v) => v && setRoundFilter(v as RoundFilter)}
        >
          <Option value="current">{t("agent.tickets.filterCurrent")}</Option>
          <Option value="all">{t("agent.tickets.filterAll")}</Option>
          <Option value="previous">{t("agent.tickets.filterPrevious")}</Option>
        </Select>
      </FormControl>

      {error && (
        <Typography level="body-sm" color="danger" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <DataCard
        loading={loading}
        empty={!loading && tickets.length === 0}
        emptyMessage={
          roundFilter === "current"
            ? t("agent.tickets.emptyCurrent")
            : roundFilter === "previous"
              ? t("agent.tickets.emptyPrevious")
              : t("agent.tickets.emptyAll")
        }
      >
        {/* Mobile: card list */}
        <Stack spacing={1.5} sx={{ display: { xs: "flex", md: "none" } }}>
              {tickets.map((ticket) => (
            <AgentTicketCard
              key={ticket.id}
              ticketId={ticket.id}
              publicId={ticket.public_id}
              roundName={one(ticket.rounds)?.name ?? "—"}
              number={ticket.number}
              buyerName={ticket.buyer_name}
              commission={Number(ticket.commission_amount)}
              status={ticket.status}
              issuedAt={ticket.issued_at}
              batchId={ticket.batch_id}
            />
          ))}
        </Stack>

        {/* Desktop: table */}
        <Box sx={{ display: { xs: "none", md: "block" }, overflowX: "auto" }}>
          <Table
            hoverRow
            stickyHeader
            sx={{ "& thead th": { bgcolor: "background.level1", fontWeight: 600 } }}
          >
            <thead>
              <tr>
                <th>{t("agent.tickets.col.id")}</th>
                <th>{t("agent.tickets.col.round")}</th>
                <th>{t("agent.tickets.col.number")}</th>
                <th>{t("agent.tickets.col.buyer")}</th>
                <th>{t("agent.tickets.col.commission")}</th>
                <th>{t("agent.tickets.col.status")}</th>
                <th>{t("agent.tickets.col.issued")}</th>
                <th style={{ width: 56 }} aria-label="PDF" />
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => {
                const isVoided = ticket.status === "voided";
                return (
                <tr
                  key={ticket.id}
                  style={isVoided ? { opacity: 0.5 } : undefined}
                >
                  <td>{ticket.public_id}</td>
                  <td>{one(ticket.rounds)?.name}</td>
                  <td>
                    <Typography fontWeight="md" sx={{ letterSpacing: "0.12em" }}>
                      {ticket.number}
                    </Typography>
                  </td>
                  <td>{ticket.buyer_name}</td>
                  <td>
                    <Typography fontWeight="md" sx={{ color: "primary.600" }}>
                      {Number(ticket.commission_amount).toLocaleString()}
                    </Typography>
                  </td>
                  <td>
                    <Chip
                      size="sm"
                      variant="soft"
                      color={ticket.status === "active" ? "success" : "danger"}
                    >
                      {ticket.status}
                    </Chip>
                  </td>
                  <td>{formatDisplayDateTime(ticket.issued_at, locale)}</td>
                  <td>
                    {!isVoided ? (
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title={t("agent.tickets.saveImage")} variant="soft">
                          <IconButton
                            size="sm"
                            variant="soft"
                            color="primary"
                            aria-label={t("agent.tickets.saveImage")}
                            onClick={() =>
                              void saveTicketImagesWithToast([
                                { id: ticket.id, number: ticket.number },
                              ])
                            }
                          >
                            <PhotoLibraryRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {ticket.batch_id && (
                          <Tooltip title={t("agent.tickets.reprint")} variant="soft">
                            <IconButton
                              size="sm"
                              variant="outlined"
                              color="neutral"
                              aria-label={t("agent.tickets.reprint")}
                              onClick={() => void downloadTicketPdf(ticket.batch_id!)}
                            >
                              <PrintRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    ) : ticket.batch_id && isVoided ? (
                      <Tooltip title={t("agent.tickets.voidedNoPdf")} variant="soft">
                        <span>
                          <IconButton
                            size="sm"
                            variant="soft"
                            color="neutral"
                            disabled
                            aria-label={t("agent.tickets.voidedNoPdf")}
                          >
                            <PrintRoundedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
              })}
            </tbody>
          </Table>
        </Box>

        {!loading && tickets.length > 0 && (
          <Stack alignItems="center" sx={{ pt: 2 }}>
            <Typography level="body-xs" sx={{ color: "text.tertiary", mb: 1 }}>
              {t("agent.tickets.showing", {
                count: tickets.length,
                unit: tickets.length === 1 ? t("common.ticket") : t("common.tickets"),
              })}
              {hasMore ? t("agent.tickets.moreAvailable") : ""}
            </Typography>
            {hasMore && (
              <Button
                variant="soft"
                fullWidth
                sx={{ maxWidth: { md: 280 } }}
                loading={loadingMore}
                onClick={() => void loadMore()}
              >
                {t("agent.tickets.loadMore", { size: PAGE_SIZE })}
              </Button>
            )}
          </Stack>
        )}
      </DataCard>
    </>
  );
}
