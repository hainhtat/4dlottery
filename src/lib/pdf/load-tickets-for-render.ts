import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPdfDateTimeEnglish } from "@/lib/pdf/format-datetime";
import { getRequestLocale } from "@/i18n/server-locale";
import { buildQrDataUrl, buildVerifyUrl } from "@/lib/pdf/generate-ticket-pdf";
import type { TicketPdfData } from "@/lib/pdf/ticket-pdf-data";
import { ticketRoundPdf } from "@/lib/supabase/embeds";
import { MAX_TICKETS_PER_BATCH } from "@/lib/tickets/batch-limits";

type AuthUser = { id: string; app_metadata?: Record<string, unknown> };

export async function loadActiveTicketsForBatch(
  batchId: string,
  user: AuthUser
): Promise<{ tickets: TicketPdfData[]; error?: string; status?: number }> {
  const role = user.app_metadata?.role as string | undefined;
  const supabase = await createClient();

  let ownerQuery = supabase
    .from("tickets")
    .select("id")
    .eq("batch_id", batchId)
    .eq("status", "active")
    .limit(1);

  if (role === "agent") {
    ownerQuery = ownerQuery.eq("agent_id", user.id);
  }

  const { data: owned, error: ownerError } = await ownerQuery;
  if (ownerError) {
    return { tickets: [], error: ownerError.message, status: 500 };
  }
  if (!owned?.length) {
    return {
      tickets: [],
      error: "Tickets not found for this batch. Try selling again or contact admin.",
      status: 404,
    };
  }

  const admin = createAdminClient();
  const { data: rows, error: loadError } = await admin
    .from("tickets")
    .select(
      `id, public_id, number, buyer_name, buyer_contact, issued_at, verify_token, agent_id, ${ticketRoundPdf}`
    )
    .eq("batch_id", batchId)
    .eq("status", "active")
    .order("number", { ascending: true });

  if (loadError) {
    return { tickets: [], error: loadError.message, status: 500 };
  }
  if (!rows?.length) {
    return { tickets: [], error: "No active tickets in this batch to print.", status: 404 };
  }
  if (rows.length > MAX_TICKETS_PER_BATCH) {
    return {
      tickets: [],
      error: `This batch has too many tickets to print (max ${MAX_TICKETS_PER_BATCH})`,
      status: 400,
    };
  }
  if (role === "agent" && rows[0].agent_id !== user.id) {
    return { tickets: [], error: "Forbidden", status: 403 };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", rows[0].agent_id)
    .single();

  const locale = await getRequestLocale();
  const tickets = await Promise.all(
    rows.map(async (t) => {
      const round = (Array.isArray(t.rounds) ? t.rounds[0] : t.rounds) as {
        name: string;
        prize_amount: number;
        ticket_price: number;
        closes_at: string;
      } | null;
      const token = t.verify_token;
      if (!token) {
        throw new Error("Ticket missing verify token — re-issue from admin");
      }
      const verifyUrl = buildVerifyUrl(t.public_id, token);
      const qrDataUrl = await buildQrDataUrl(verifyUrl);
      return {
        roundName: round?.name ?? "Round",
        prizeAmount: Number(round?.prize_amount ?? 0),
        ticketPrice: Number(round?.ticket_price ?? 0),
        number: t.number,
        holderName: t.buyer_name,
        contact: t.buyer_contact,
        agentName: profile?.display_name ?? "Agent",
        drawDate: round?.closes_at ? formatPdfDateTimeEnglish(round.closes_at) : "—",
        issuedAt: formatPdfDateTimeEnglish(t.issued_at),
        publicId: t.public_id,
        verifyUrl,
        qrDataUrl,
        locale,
      } satisfies TicketPdfData;
    })
  );

  return { tickets };
}

export async function loadActiveTicketForRender(
  ticketId: string,
  user: AuthUser
): Promise<{ ticket: TicketPdfData | null; error?: string; status?: number }> {
  const role = user.app_metadata?.role as string | undefined;
  const supabase = await createClient();

  let ownerBuilder = supabase
    .from("tickets")
    .select("id, batch_id")
    .eq("id", ticketId)
    .eq("status", "active");

  if (role === "agent") {
    ownerBuilder = ownerBuilder.eq("agent_id", user.id);
  }

  const { data: owned, error: ownerError } = await ownerBuilder.maybeSingle();
  if (ownerError) {
    return { ticket: null, error: ownerError.message, status: 500 };
  }
  if (!owned?.batch_id) {
    return { ticket: null, error: "Ticket not found or voided.", status: 404 };
  }

  const admin = createAdminClient();
  const { data: row, error: loadError } = await admin
    .from("tickets")
    .select(
      `id, public_id, number, buyer_name, buyer_contact, issued_at, verify_token, agent_id, ${ticketRoundPdf}`
    )
    .eq("id", ticketId)
    .eq("status", "active")
    .maybeSingle();

  if (loadError || !row) {
    return { ticket: null, error: loadError?.message ?? "Ticket not found", status: 404 };
  }
  if (role === "agent" && row.agent_id !== user.id) {
    return { ticket: null, error: "Forbidden", status: 403 };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", row.agent_id)
    .single();

  const locale = await getRequestLocale();
  const round = (Array.isArray(row.rounds) ? row.rounds[0] : row.rounds) as {
    name: string;
    prize_amount: number;
    ticket_price: number;
    closes_at: string;
  } | null;
  const token = row.verify_token;
  if (!token) {
    return { ticket: null, error: "Ticket missing verify token", status: 500 };
  }
  const verifyUrl = buildVerifyUrl(row.public_id, token);
  const qrDataUrl = await buildQrDataUrl(verifyUrl);

  return {
    ticket: {
      roundName: round?.name ?? "Round",
      prizeAmount: Number(round?.prize_amount ?? 0),
      ticketPrice: Number(round?.ticket_price ?? 0),
      number: row.number,
      holderName: row.buyer_name,
      contact: row.buyer_contact,
      agentName: profile?.display_name ?? "Agent",
      drawDate: round?.closes_at ? formatPdfDateTimeEnglish(round.closes_at) : "—",
      issuedAt: formatPdfDateTimeEnglish(row.issued_at),
      publicId: row.public_id,
      verifyUrl,
      qrDataUrl,
      locale,
    },
  };
}
