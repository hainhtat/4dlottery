import { NextResponse } from "next/server";
import { rateLimitResponse } from "@/lib/api/rate-limit-response";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildVerifyPayload, signVerifyToken } from "@/lib/crypto/verify-token";
import { MAX_TICKETS_PER_BATCH } from "@/lib/tickets/batch-limits";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.app_metadata?.role !== "agent") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const limited = await enforceRateLimit("ticket-issue", user.id);
  if (!limited.ok) {
    return rateLimitResponse(limited.retryAfterSec);
  }

  const secret = process.env.TICKET_HMAC_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const body = await request.json();
  const { roundId, buyerName, buyerContact, numbers } = body as {
    roundId: string;
    buyerName: string;
    buyerContact: string;
    numbers: string[];
  };

  if (!Array.isArray(numbers) || numbers.length < 1) {
    return NextResponse.json({ error: "At least one number is required" }, { status: 400 });
  }
  if (numbers.length > MAX_TICKETS_PER_BATCH) {
    return NextResponse.json(
      { error: `Maximum ${MAX_TICKETS_PER_BATCH} tickets per sale` },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc("issue_tickets", {
    p_round_id: roundId,
    p_buyer_name: buyerName,
    p_buyer_contact: buyerContact,
    p_numbers: numbers.map((n: string) => n.padStart(4, "0")),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const result = data as {
    batch_id: string;
    tickets: {
      id: string;
      public_id: string;
      number: string;
      issued_at: string;
      commission_amount?: number;
    }[];
    round_name: string;
    ticket_price: number;
    commission_per_ticket?: number;
  };

  const tokenUpdates = result.tickets.map((t) => {
    const payload = buildVerifyPayload({
      ticketId: t.id,
      roundId,
      number: t.number,
      issuedAt: t.issued_at,
      status: "active",
    });
    return {
      id: t.id,
      verify_token: signVerifyToken(payload, secret),
    };
  });

  const admin = createAdminClient();
  const { error: tokenError } = await admin.rpc("apply_verify_tokens_for_batch", {
    p_batch_id: result.batch_id,
    p_updates: tokenUpdates,
  });

  if (tokenError) {
    return NextResponse.json(
      {
        error:
          tokenError.message ||
          "Tickets created but verify tokens could not be saved. Contact admin before re-selling those numbers.",
      },
      { status: 500 }
    );
  }

  const ticketPrice = Number(result.ticket_price);
  const count = result.tickets.length;
  const totalCommission = result.tickets.reduce(
    (sum, t) => sum + Number(t.commission_amount ?? 0),
    0
  );

  const tokenByTicketId = new Map(
    tokenUpdates.map((u) => [u.id, u.verify_token] as const)
  );
  const ticketsWithTokens: Array<
    (typeof result.tickets)[number] & { verifyToken: string }
  > = [];
  for (const t of result.tickets) {
    const verifyToken = tokenByTicketId.get(t.id);
    if (!verifyToken) {
      return NextResponse.json(
        { error: "Tickets created but verify token signing was incomplete" },
        { status: 500 }
      );
    }
    ticketsWithTokens.push({ ...t, verifyToken });
  }

  return NextResponse.json({
    batchId: result.batch_id,
    tickets: ticketsWithTokens,
    roundName: result.round_name,
    ticketPrice,
    totalAmount: ticketPrice * count,
    totalCommission,
  });
}
