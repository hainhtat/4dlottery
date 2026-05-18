import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTicketPng } from "@/lib/pdf/generate-ticket-pdf";
import { loadActiveTicketForRender } from "@/lib/pdf/load-tickets-for-render";
import { logError } from "@/lib/observability/logger";
import { captureServerException } from "@/lib/observability/sentry";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loaded = await loadActiveTicketForRender(ticketId, user);
  if (!loaded.ticket) {
    return NextResponse.json(
      { error: loaded.error ?? "Not found" },
      { status: loaded.status ?? 404 }
    );
  }

  try {
    const buffer = await generateTicketPng(loaded.ticket);
    const filename = `ticket-${loaded.ticket.number}.png`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    logError("ticket-png.failed", error, { ticketId });
    captureServerException(error, { ticketId, route: "png" });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Image generation failed" },
      { status: 500 }
    );
  }
}
