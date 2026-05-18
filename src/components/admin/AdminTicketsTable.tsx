"use client";

import { useCallback, useEffect, useState } from "react";
import Table from "@mui/joy/Table";
import Button from "@mui/joy/Button";
import Chip from "@mui/joy/Chip";
import Modal from "@mui/joy/Modal";
import ModalDialog from "@mui/joy/ModalDialog";
import ModalClose from "@mui/joy/ModalClose";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataCard } from "@/components/ui/DataCard";
import { ticketAgentEmbed, ticketRoundName } from "@/lib/supabase/embeds";
import { one } from "@/lib/utils/supabase-relations";
import { useLocale, useT } from "@/components/providers/LocaleProvider";
import { formatDisplayDateTime } from "@/lib/pdf/format-datetime";
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
  round_id: string;
  rounds: { name: string } | { name: string }[] | null;
  profiles: { display_name: string } | { display_name: string }[] | null;
}

type ListCursor = { issued_at: string; id: string };

export function AdminTicketsTable() {
  const t = useT();
  const { locale } = useLocale();
  const supabase = createClient();
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
  const [voidId, setVoidId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
  }, [supabase, t]);

  const fetchPage = useCallback(
    async (after: ListCursor | null) => {
      const { currentRoundId } = roundContext;

      let query = supabase
        .from("tickets")
        .select(
          `id, public_id, number, buyer_name, status, issued_at, round_id,
           ${ticketRoundName}, ${ticketAgentEmbed}`
        )
        .order("issued_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(PAGE_SIZE + 1);

      if (roundFilter === "current" && currentRoundId) {
        query = query.eq("round_id", currentRoundId);
      } else if (roundFilter === "previous" && currentRoundId) {
        query = query.neq("round_id", currentRoundId);
      }

      if (after) {
        const ts = encodeURIComponent(after.issued_at);
        const id = after.id;
        query = query.or(`issued_at.lt.${ts},and(issued_at.eq.${ts},id.lt.${id})`);
      }

      const { data, error: queryError } = await query;
      if (queryError) throw queryError;

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

    fetchPage(null)
      .then((result) => {
        if (cancelled) return;
        setTickets(result.rows);
        setHasMore(result.hasMore);
        setCursor(result.nextCursor ?? null);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t("agent.tickets.loadFailed"));
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
      const result = await fetchPage(cursor);
      setTickets((prev) => [...prev, ...result.rows]);
      setHasMore(result.hasMore);
      setCursor(result.nextCursor ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("agent.tickets.loadMoreFailed"));
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleVoid(e: React.FormEvent) {
    e.preventDefault();
    if (!voidId) return;
    setSubmitting(true);
    const { error: voidError } = await supabase.rpc("void_ticket", {
      p_ticket_id: voidId,
      p_reason: reason,
    });
    setSubmitting(false);

    if (voidError) toast.error(voidError.message);
    else {
      toast.success(t("admin.tickets.voided"));
      setVoidId(null);
      setReason("");
      setTickets((prev) =>
        prev.map((row) => (row.id === voidId ? { ...row, status: "voided" } : row))
      );
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

  const emptyMessage =
    roundFilter === "current"
      ? t("agent.tickets.emptyCurrent")
      : roundFilter === "previous"
        ? t("agent.tickets.emptyPrevious")
        : t("admin.tickets.empty");

  return (
    <>
      <PageHeader title={t("admin.tickets.pageTitle")} description={filterLabel} />

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

      <DataCard loading={loading} empty={!loading && tickets.length === 0} emptyMessage={emptyMessage}>
        <Table hoverRow stickyHeader sx={{ "& thead th": { bgcolor: "background.level1", fontWeight: 600 } }}>
          <thead>
            <tr>
              <th>{t("agent.tickets.col.id")}</th>
              <th>{t("agent.tickets.col.round")}</th>
              <th>{t("agent.tickets.col.number")}</th>
              <th>{t("agent.tickets.col.buyer")}</th>
              <th>{t("admin.tickets.col.agent")}</th>
              <th>{t("agent.tickets.col.status")}</th>
              <th>{t("agent.tickets.col.issued")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((row) => (
              <tr key={row.id}>
                <td>{row.public_id}</td>
                <td>{one(row.rounds)?.name}</td>
                <td>{row.number}</td>
                <td>{row.buyer_name}</td>
                <td>{one(row.profiles)?.display_name}</td>
                <td>
                  <Chip
                    size="sm"
                    variant="soft"
                    color={row.status === "active" ? "success" : "danger"}
                  >
                    {row.status === "active"
                      ? t("admin.tickets.statusActive")
                      : t("admin.tickets.statusVoided")}
                  </Chip>
                </td>
                <td>{formatDisplayDateTime(row.issued_at, locale)}</td>
                <td>
                  {row.status === "active" && (
                    <Button
                      size="sm"
                      color="danger"
                      variant="outlined"
                      onClick={() => setVoidId(row.id)}
                    >
                      {t("admin.tickets.void")}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>

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

      <Modal open={!!voidId} onClose={() => setVoidId(null)}>
        <ModalDialog>
          <ModalClose />
          <Typography level="h4">{t("admin.tickets.voidTitle")}</Typography>
          <form onSubmit={handleVoid}>
            <FormControl sx={{ mt: 2 }}>
              <FormLabel>{t("admin.tickets.voidReason")}</FormLabel>
              <Input required value={reason} onChange={(e) => setReason(e.target.value)} />
            </FormControl>
            <Button type="submit" color="danger" loading={submitting} sx={{ mt: 2 }}>
              {t("admin.tickets.voidConfirm")}
            </Button>
          </form>
        </ModalDialog>
      </Modal>
    </>
  );
}
