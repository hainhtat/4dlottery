import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPdfDateTimeEnglish } from "@/lib/pdf/format-datetime";
import { getRequestLocale } from "@/i18n/server-locale";
import {
  buildQrDataUrl,
  buildVerifyUrl,
  generateTicketPdf,
} from "@/lib/pdf/generate-ticket-pdf";
import { ticketRoundPdf } from "@/lib/supabase/embeds";
import { MAX_TICKETS_PER_BATCH } from "@/lib/tickets/batch-limits";
import { logError, logPdfTiming } from "@/lib/observability/logger";
import { captureServerException } from "@/lib/observability/sentry";

/** Headless Chromium PDF export can take several seconds. */
export const maxDuration = 60;
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const started = Date.now();
  const { batchId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = user.app_metadata?.role as string | undefined;

  // Ownership check with user session (RLS)
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
    return NextResponse.json({ error: ownerError.message }, { status: 500 });
  }

  if (!owned?.length) {
    return NextResponse.json(
      { error: "Tickets not found for this batch. Try selling again or contact admin." },
      { status: 404 }
    );
  }

  // Load full rows for PDF (service role avoids embed/RLS edge cases)
  const admin = createAdminClient();
  const { data: tickets, error: loadError } = await admin
    .from("tickets")
    .select(
      `id, public_id, number, buyer_name, buyer_contact, issued_at, verify_token, agent_id, ${ticketRoundPdf}`
    )
    .eq("batch_id", batchId)
    .eq("status", "active")
    .order("number", { ascending: true });

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 });
  }

  if (!tickets?.length) {
    return NextResponse.json(
      { error: "No active tickets in this batch to print." },
      { status: 404 }
    );
  }

  if (tickets.length > MAX_TICKETS_PER_BATCH) {
    return NextResponse.json(
      { error: `This batch has too many tickets to print (max ${MAX_TICKETS_PER_BATCH})` },
      { status: 400 }
    );
  }

  if (role === "agent" && tickets[0].agent_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", tickets[0].agent_id)
    .single();

  const locale = await getRequestLocale();
  const loadMs = Date.now() - started;

  const renderStarted = Date.now();
  const pdfTickets = await Promise.all(
    tickets.map(async (t) => {
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
        drawDate: round?.closes_at
          ? formatPdfDateTimeEnglish(round.closes_at)
          : "—",
        issuedAt: formatPdfDateTimeEnglish(t.issued_at),
        publicId: t.public_id,
        verifyUrl,
        qrDataUrl,
        locale,
      };
    })
  );

  try {
    const buffer = await generateTicketPdf(pdfTickets);
    const renderMs = Date.now() - renderStarted;
    const totalMs = Date.now() - started;
    logPdfTiming({
      batchId,
      ticketCount: pdfTickets.length,
      loadMs,
      renderMs,
      totalMs,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="tickets-${batchId.slice(0, 8)}.pdf"`,
        "Server-Timing": `pdf;dur=${totalMs}`,
      },
    });
  } catch (error) {
    logError("pdf.failed", error, { batchId, ticketCount: pdfTickets.length });
    captureServerException(error, { batchId, route: "pdf" });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "PDF generation failed" },
      { status: 500 }
    );
  }
}
