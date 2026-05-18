"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Chip from "@mui/joy/Chip";
import Typography from "@mui/joy/Typography";
import Card from "@mui/joy/Card";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import Button from "@mui/joy/Button";
import Stack from "@mui/joy/Stack";
import Alert from "@mui/joy/Alert";
import IconButton from "@mui/joy/IconButton";
import Box from "@mui/joy/Box";
import CircularProgress from "@mui/joy/CircularProgress";
import Divider from "@mui/joy/Divider";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import RemoveCircleOutlineRoundedIcon from "@mui/icons-material/RemoveCircleOutlineRounded";
import { toast } from "react-toastify";
import { csrfHeaders } from "@/lib/api/csrf";
import { createClient } from "@/lib/supabase/client";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { downloadTicketPdf } from "@/lib/tickets/download-pdf";
import {
  checkNumberAvailable,
  type NumberCheckStatus,
} from "@/lib/tickets/number-status";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";
import { PremiumModalDialog } from "@/components/ui/PremiumModalDialog";
import { AgentSettlementSummary } from "@/components/agent/AgentSettlementSummary";
import { AgentNotificationAlerts } from "@/components/agent/AgentNotificationAlerts";
import { useAgentRefresh } from "@/components/agent/AgentRefreshContext";
import { formatMoneyDisplay } from "@/lib/utils/money";
import type { Round } from "@/lib/types/database";
import { useT } from "@/components/providers/LocaleProvider";

import { MAX_TICKETS_PER_BATCH } from "@/lib/tickets/batch-limits";

const MAX_NUMBERS_PER_SALE = MAX_TICKETS_PER_BATCH;

interface SellPageData {
  rounds: Round[];
  notifications: { id: string; message: string }[];
}

/** Review only — tickets are not created until the agent confirms. */
interface PendingSale {
  roundId: string;
  roundName: string;
  buyerName: string;
  buyerContact: string;
  numbers: string[];
  ticketPrice: number;
  totalAmount: number;
}

function normalizeNumber(value: string | undefined): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length === 4 ? digits.padStart(4, "0") : digits;
}

function isRoundOpen(r: Round): boolean {
  if (r.status !== "open") return false;
  const now = Date.now();
  return now >= new Date(r.opens_at).getTime() && now <= new Date(r.closes_at).getTime();
}

function statusColor(
  status: NumberCheckStatus | undefined
): "neutral" | "success" | "danger" | "warning" {
  switch (status) {
    case "available":
      return "success";
    case "taken":
    case "invalid":
      return "danger";
    case "duplicate":
      return "warning";
    case "checking":
      return "neutral";
    default:
      return "neutral";
  }
}

export function SellTicketsForm() {
  const supabase = createClient();
  const { refreshKey, notifyAgentDataChanged } = useAgentRefresh();
  const t = useT();

  function statusLabel(status: NumberCheckStatus | undefined): string | null {
    switch (status) {
      case "checking":
        return t("agent.sell.status.checking");
      case "available":
        return t("agent.sell.status.available");
      case "taken":
        return t("agent.sell.status.taken");
      case "duplicate":
        return t("agent.sell.status.duplicate");
      case "invalid":
        return t("agent.sell.status.invalid");
      default:
        return null;
    }
  }

  const fetchSellData = useCallback(async (): Promise<SellPageData> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { rounds: [], notifications: [] };
    }

    const [roundsRes, notifRes] = await Promise.all([
      supabase.from("rounds").select("*").eq("status", "open").order("closes_at", { ascending: true }),
      supabase
        .from("agent_notifications")
        .select("id, message")
        .eq("agent_id", user.id)
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    if (roundsRes.error) throw roundsRes.error;

    const rounds = ((roundsRes.data ?? []) as Round[]).filter(isRoundOpen);

    return {
      rounds,
      notifications: Array.isArray(notifRes.data) ? notifRes.data : [],
    };
  }, [supabase]);

  const { data, loading, error, refetch, setData } = useAsyncData(fetchSellData, [refreshKey]);
  const [dismissingNotificationId, setDismissingNotificationId] = useState<string | null>(null);

  const dismissNotification = useCallback(
    async (id: string) => {
      setDismissingNotificationId(id);
      const { error: dismissError } = await supabase
        .from("agent_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);

      setDismissingNotificationId(null);

      if (dismissError) {
        toast.error(dismissError.message);
        return;
      }

      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          notifications: prev.notifications.filter((n) => n.id !== id),
        };
      });
    },
    [supabase, setData]
  );

  const openRounds = data?.rounds ?? [];
  const notifications = data?.notifications ?? [];

  const [roundId, setRoundId] = useState<string | null>(null);
  const [buyerName, setBuyerName] = useState("");
  const [buyerContact, setBuyerContact] = useState("");
  const [numberRows, setNumberRows] = useState<string[]>([""]);
  const [numberStatuses, setNumberStatuses] = useState<Record<number, NumberCheckStatus>>({});
  const [submitting, setSubmitting] = useState(false);
  const [pendingSale, setPendingSale] = useState<PendingSale | null>(null);
  const [downloading, setDownloading] = useState(false);
  const checkSeqRef = useRef<Record<number, number>>({});
  const lastVerifiedRef = useRef<Record<number, string>>({});

  const activeRoundId = useMemo(() => {
    if (roundId && openRounds.some((r) => r.id === roundId)) {
      return roundId;
    }
    return openRounds[0]?.id ?? "";
  }, [roundId, openRounds]);

  const selectedRound = openRounds.find((r) => r.id === activeRoundId);

  const runNumberCheck = useCallback(
    async (index: number, raw: string, rows: string[]) => {
      const digits = raw.replace(/\D/g, "");
      if (digits.length === 0) {
        setNumberStatuses((s) => ({ ...s, [index]: "idle" }));
        return;
      }
      if (digits.length < 4) {
        setNumberStatuses((s) => ({ ...s, [index]: "idle" }));
        return;
      }

      const normalized = normalizeNumber(digits);
      const duplicate = rows.some(
        (n, i) => i !== index && normalizeNumber(n) === normalized && normalized.length === 4
      );
      if (duplicate) {
        setNumberStatuses((s) => ({ ...s, [index]: "duplicate" }));
        return;
      }

      if (!activeRoundId) return;

      const seq = (checkSeqRef.current[index] ?? 0) + 1;
      checkSeqRef.current[index] = seq;
      setNumberStatuses((s) => ({ ...s, [index]: "checking" }));
      try {
        const result = await checkNumberAvailable(activeRoundId, digits);
        if (checkSeqRef.current[index] !== seq) return;
        if (result.available) {
          lastVerifiedRef.current[index] = normalized;
          setNumberStatuses((s) => ({ ...s, [index]: "available" }));
        } else if (result.reason === "taken") {
          delete lastVerifiedRef.current[index];
          setNumberStatuses((s) => ({ ...s, [index]: "taken" }));
        } else {
          setNumberStatuses((s) => ({ ...s, [index]: "invalid" }));
        }
      } catch {
        if (checkSeqRef.current[index] !== seq) return;
        setNumberStatuses((s) => ({ ...s, [index]: "idle" }));
      }
    },
    [activeRoundId]
  );

  const debouncedNumberCheck = useDebouncedCallback(
    (index: number, value: string, rows: string[]) => {
      void runNumberCheck(index, value, rows);
    },
    400
  );

  function updateNumber(index: number, value: string) {
    const cleaned = value.replace(/\D/g, "").slice(0, 4);
    setNumberRows((prev) => {
      const next = [...prev];
      next[index] = cleaned;
      debouncedNumberCheck(index, cleaned, next);
      return next;
    });
  }

  function blurNumber(index: number) {
    setNumberRows((prev) => {
      const next = [...prev];
      const normalized = normalizeNumber(next[index]);
      next[index] = normalized;
      if (normalized.length === 4 && lastVerifiedRef.current[index] === normalized) {
        return next;
      }
      if (normalized.length === 4) {
        void runNumberCheck(index, normalized, next);
      }
      return next;
    });
  }

  function clearNumberStatuses() {
    setNumberStatuses({});
    checkSeqRef.current = {};
    lastVerifiedRef.current = {};
  }

  function addNumberRow() {
    setNumberRows((prev) => {
      if (prev.length >= MAX_NUMBERS_PER_SALE) {
        toast.info(t("agent.sell.maxNumbers", { max: MAX_NUMBERS_PER_SALE }));
        return prev;
      }
      return [...prev, ""];
    });
  }

  function removeNumberRow(index: number) {
    setNumberRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = numberRows.map(normalizeNumber).filter((n) => n.length === 4);

    if (!parsed.length) {
      toast.error(t("agent.sell.error.enterNumber"));
      return;
    }
    if (new Set(parsed).size !== parsed.length) {
      toast.error(t("agent.sell.error.eachDifferent"));
      return;
    }
    if (!activeRoundId || !selectedRound) {
      toast.error(t("agent.sell.error.noRound"));
      return;
    }

    const blockedRow = numberRows.findIndex((row, i) => {
      const n = normalizeNumber(row);
      if (n.length !== 4) return false;
      const st = numberStatuses[i];
      return st === "taken" || st === "duplicate" || st === "invalid";
    });
    if (blockedRow >= 0) {
      toast.error(t("agent.sell.error.fixRedContinue"));
      return;
    }

    setSubmitting(true);

    for (let i = 0; i < numberRows.length; i++) {
      const n = normalizeNumber(numberRows[i]);
      if (n.length !== 4) continue;
      const result = await checkNumberAvailable(activeRoundId, n);
      if (!result.available) {
        setNumberStatuses((s) => ({
          ...s,
          [i]: result.reason === "taken" ? "taken" : "invalid",
        }));
        setSubmitting(false);
        toast.error(t("agent.sell.error.numberUnavailable", { n }));
        return;
      }
      setNumberStatuses((s) => ({ ...s, [i]: "available" }));
    }

    const ticketPrice = Number(selectedRound.ticket_price);
    setSubmitting(false);
    setPendingSale({
      roundId: activeRoundId,
      roundName: selectedRound.name,
      buyerName: buyerName.trim(),
      buyerContact: buyerContact.trim(),
      numbers: parsed,
      ticketPrice,
      totalAmount: ticketPrice * parsed.length,
    });
  }

  async function confirmSale() {
    if (!pendingSale) return;
    setDownloading(true);

    try {
      for (let i = 0; i < pendingSale.numbers.length; i++) {
        const n = pendingSale.numbers[i];
        const result = await checkNumberAvailable(pendingSale.roundId, n);
        if (!result.available) {
          toast.error(t("agent.sell.error.numberUnavailableCancel", { n }));
          setPendingSale(null);
          return;
        }
      }

      const res = await fetch("/api/tickets/issue", {
        method: "POST",
        headers: csrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          roundId: pendingSale.roundId,
          buyerName: pendingSale.buyerName,
          buyerContact: pendingSale.buyerContact,
          numbers: pendingSale.numbers,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || t("agent.sell.error.createFailed"));
        return;
      }

      await downloadTicketPdf(json.batchId as string);
      toast.success(t("agent.sell.success"));
      setPendingSale(null);
      setNumberRows([""]);
      clearNumberStatuses();
      setBuyerName("");
      setBuyerContact("");
      notifyAgentDataChanged();
      refetch({ silent: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("agent.sell.error.saleFailed"));
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress size="lg" />
        <Typography sx={{ mt: 2 }}>{t("common.loading")}</Typography>
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert color="danger" sx={{ maxWidth: 480, mx: "auto" }}>
        {error}
      </Alert>
    );
  }

  if (openRounds.length === 0) {
    return (
      <Box sx={{ width: "100%", maxWidth: 480, mx: "auto" }}>
        <AgentNotificationAlerts
          notifications={notifications}
          onDismiss={dismissNotification}
          dismissingId={dismissingNotificationId}
        />

        <AgentSettlementSummary showWinnerOnMyWin />

        <Card variant="soft" sx={{ p: 3, textAlign: "center" }}>
          <Typography level="h4" sx={{ mb: 1 }}>
            {t("agent.sell.noOpenRounds")}
          </Typography>
          <Typography level="body-md" sx={{ color: "text.tertiary" }}>
            {t("agent.sell.awaitingNextRound")}
          </Typography>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", maxWidth: 480, mx: "auto", px: { xs: 0, sm: 0 } }}>
      <AgentNotificationAlerts
        notifications={notifications}
        onDismiss={dismissNotification}
        dismissingId={dismissingNotificationId}
      />

      {activeRoundId && (
        <AgentSettlementSummary
          compact
          defaultRoundId={activeRoundId}
          showWinnerOnMyWin
        />
      )}

      <Card
        variant="outlined"
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          borderColor: "primary.300",
          boxShadow: "md",
        }}
      >
        <Box sx={{ mb: 2.5 }}>
          <Typography level="h3" sx={{ fontWeight: 700 }}>
            {t("agent.sell.title")}
          </Typography>
          <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
            {selectedRound?.name ?? t("common.round")}
            {selectedRound
              ? ` · ${Number(selectedRound.ticket_price).toLocaleString()} ${t("common.perTicket")}`
              : ""}
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            {openRounds.length > 1 && (
              <FormControl>
                <FormLabel>{t("common.round")}</FormLabel>
                <Select
                  size="lg"
                  value={activeRoundId}
                  onChange={(_, v) => {
                    if (v) {
                      setRoundId(v as string);
                      setNumberRows([""]);
                      clearNumberStatuses();
                    }
                  }}
                >
                  {openRounds.map((r) => (
                    <Option key={r.id} value={r.id}>
                      {r.name} ({Number(r.ticket_price).toLocaleString()})
                    </Option>
                  ))}
                </Select>
              </FormControl>
            )}

            <FormControl>
              <FormLabel>{t("agent.sell.customerName")}</FormLabel>
              <Input
                size="lg"
                required
                placeholder={t("agent.sell.customerNamePlaceholder")}
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>{t("agent.sell.phone")}</FormLabel>
              <Input
                size="lg"
                required
                type="tel"
                placeholder={t("agent.sell.phonePlaceholder")}
                value={buyerContact}
                onChange={(e) => setBuyerContact(e.target.value)}
              />
            </FormControl>

            <Box>
              <FormLabel sx={{ mb: 1 }}>{t("agent.sell.luckyNumbers")}</FormLabel>
              <Stack spacing={1.5}>
                {numberRows.map((num, index) => {
                  const st = numberStatuses[index];
                  const hint = statusLabel(st);
                  return (
                    <Box key={index}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Input
                          size="lg"
                          required={index === 0}
                          placeholder="0000"
                          value={num ?? ""}
                          onChange={(e) => updateNumber(index, e.target.value)}
                          onBlur={() => blurNumber(index)}
                          color={
                            st === "taken" || st === "invalid"
                              ? "danger"
                              : st === "available"
                                ? "success"
                                : undefined
                          }
                          slotProps={{
                            input: {
                              inputMode: "numeric",
                              maxLength: 4,
                              style: {
                                fontSize: "1.5rem",
                                letterSpacing: "0.35em",
                                textAlign: "center",
                                fontWeight: 700,
                              },
                            },
                          }}
                          sx={{ flex: 1 }}
                        />
                        {numberRows.length > 1 && (
                          <IconButton
                            variant="outlined"
                            color="neutral"
                            aria-label={t("agent.sell.removeNumber")}
                            onClick={() => {
                              removeNumberRow(index);
                              setNumberStatuses((s) => {
                                const next = { ...s };
                                delete next[index];
                                return next;
                              });
                            }}
                          >
                            <RemoveCircleOutlineRoundedIcon />
                          </IconButton>
                        )}
                      </Stack>
                      {hint && (
                        <Chip
                          size="sm"
                          variant="soft"
                          color={statusColor(st)}
                          sx={{ mt: 0.5 }}
                          startDecorator={
                            st === "checking" ? <CircularProgress size="sm" /> : undefined
                          }
                        >
                          {hint}
                        </Chip>
                      )}
                    </Box>
                  );
                })}
              </Stack>

              {numberRows.length < MAX_NUMBERS_PER_SALE && (
                <Button
                  type="button"
                  variant="soft"
                  color="primary"
                  fullWidth
                  size="lg"
                  startDecorator={<AddCircleOutlineRoundedIcon />}
                  onClick={addNumberRow}
                  sx={{ mt: 1.5 }}
                >
                  {t("agent.sell.addNumber")}
                </Button>
              )}
            </Box>

            <Button
              type="submit"
              loading={submitting}
              size="lg"
              fullWidth
              sx={{ mt: 1, py: 1.75, fontSize: "1.1rem", fontWeight: 700 }}
            >
              {t("agent.sell.reviewPrint")}
            </Button>
          </Stack>
        </form>
      </Card>

      <Typography level="body-xs" sx={{ textAlign: "center", color: "text.tertiary", mt: 2 }}>
        {t("agent.sell.confirmHint")}
      </Typography>

      <PremiumModalDialog
        open={!!pendingSale}
        onClose={() => !downloading && setPendingSale(null)}
        title={t("agent.sell.confirmTitle")}
        subtitle={t("agent.sell.confirmSubtitle")}
        maxWidth={480}
      >
        {pendingSale && (
          <Stack spacing={2}>
            <Box
              sx={{
                p: 2.5,
                borderRadius: "lg",
                border: "2px solid",
                borderColor: "primary.400",
                bgcolor: "primary.50",
                boxShadow: "inset 0 0 0 1px rgba(201, 162, 39, 0.15)",
              }}
            >
              <Typography
                level="body-xs"
                sx={{ color: "primary.700", letterSpacing: "0.12em", fontWeight: 700, mb: 1.5 }}
              >
                {t("agent.sell.checkCarefully")}
              </Typography>

              <Stack spacing={2}>
                <ConfirmField label={t("agent.sell.customerName")} value={pendingSale.buyerName} />
                <ConfirmField label={t("agent.sell.phone")} value={pendingSale.buyerContact} />
                <Box>
                  <Typography level="body-xs" sx={{ color: "text.tertiary", mb: 1 }}>
                    {t("agent.sell.luckyNumbers")}
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {pendingSale.numbers.map((n) => (
                      <Box
                        key={n}
                        sx={{
                          px: 2,
                          py: 1,
                          borderRadius: "md",
                          bgcolor: "background.surface",
                          border: "1px solid",
                          borderColor: "primary.300",
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: "1.5rem",
                            fontWeight: 700,
                            letterSpacing: "0.35em",
                            color: "primary.800",
                          }}
                        >
                          {n}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>

                <Box
                  sx={{
                    mt: 0.5,
                    pt: 2,
                    borderTop: "1px dashed",
                    borderColor: "primary.300",
                  }}
                >
                  <Typography level="body-xs" sx={{ color: "text.tertiary", mb: 0.35 }}>
                    {t("agent.sell.totalCollect")}
                  </Typography>
                  <Typography level="h3" fontWeight={700} sx={{ color: "primary.800" }}>
                    {formatMoneyDisplay(pendingSale.totalAmount)}
                  </Typography>
                  <Typography level="body-xs" sx={{ color: "text.tertiary", mt: 0.5 }}>
                    {t("agent.sell.ticketLine", {
                      count: pendingSale.numbers.length,
                      unit:
                        pendingSale.numbers.length === 1
                          ? t("common.ticket")
                          : t("common.tickets"),
                      price: formatMoneyDisplay(pendingSale.ticketPrice),
                    })}
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
              {t("agent.sell.roundLabel", { name: pendingSale.roundName })}
            </Typography>

            <Divider />
            <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
              <Button
                variant="outlined"
                color="neutral"
                fullWidth
                disabled={downloading}
                onClick={() => setPendingSale(null)}
              >
                {t("common.cancel")}
              </Button>
              <Button fullWidth loading={downloading} onClick={() => void confirmSale()}>
                {t("agent.sell.confirmSale")}
              </Button>
            </Stack>
          </Stack>
        )}
      </PremiumModalDialog>
    </Box>
  );
}

function ConfirmField({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography level="body-xs" sx={{ color: "text.tertiary", mb: 0.35 }}>
        {label}
      </Typography>
      <Typography level="title-lg" fontWeight={700} sx={{ color: "text.primary" }}>
        {value}
      </Typography>
    </Box>
  );
}
