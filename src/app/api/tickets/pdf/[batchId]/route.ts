import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTicketPdf } from "@/lib/pdf/generate-ticket-pdf";
import { loadActiveTicketsForBatch } from "@/lib/pdf/load-tickets-for-render";
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

  const loaded = await loadActiveTicketsForBatch(batchId, user);
  if (!loaded.tickets.length) {
    return NextResponse.json(
      { error: loaded.error ?? "Not found" },
      { status: loaded.status ?? 404 }
    );
  }

  const loadMs = Date.now() - started;
  const renderStarted = Date.now();

  try {
    const buffer = await generateTicketPdf(loaded.tickets);
    const renderMs = Date.now() - renderStarted;
    const totalMs = Date.now() - started;
    logPdfTiming({
      batchId,
      ticketCount: loaded.tickets.length,
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
    logError("pdf.failed", error, { batchId, ticketCount: loaded.tickets.length });
    captureServerException(error, { batchId, route: "pdf" });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "PDF generation failed" },
      { status: 500 }
    );
  }
}
