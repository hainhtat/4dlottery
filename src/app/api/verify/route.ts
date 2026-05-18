import { NextResponse } from "next/server";
import { rateLimitResponse } from "@/lib/api/rate-limit-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildVerifyPayload, signVerifyToken, verifyTokenMatch } from "@/lib/crypto/verify-token";
import { getClientIp } from "@/lib/http/client-ip";
import { enforceRateLimit } from "@/lib/rate-limit";
import { maskContact, maskName } from "@/lib/utils/mask";
import { ticketRoundEmbed } from "@/lib/supabase/embeds";

const INVALID_RESPONSE = {
  valid: false,
  status: "invalid",
  message: "Ticket not found or verification failed",
} as const;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const publicId = searchParams.get("publicId");
  const token = searchParams.get("t");

  if (!publicId || !token) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const limited = await enforceRateLimit("verify", getClientIp(request));
  if (!limited.ok) {
    return rateLimitResponse(limited.retryAfterSec);
  }

  const secret = process.env.TICKET_HMAC_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const admin = createAdminClient();
  const { data: ticket, error } = await admin
    .from("tickets")
    .select(
      `
      id, public_id, number, status, issued_at, verify_token, round_id,
      buyer_name, buyer_contact,
      ${ticketRoundEmbed} ( name, status, winning_number, winner_ticket_id ),
      profiles!tickets_agent_id_fkey ( display_name )
    `
    )
    .eq("public_id", publicId)
    .single();

  if (error || !ticket) {
    return NextResponse.json(INVALID_RESPONSE);
  }

  const payload = buildVerifyPayload({
    ticketId: ticket.id,
    roundId: ticket.round_id,
    number: ticket.number,
    issuedAt: ticket.issued_at,
    status: ticket.status,
  });
  const expected = signVerifyToken(payload, secret);
  const signatureValid =
    verifyTokenMatch(ticket.verify_token, token) &&
    verifyTokenMatch(expected, token);

  if (!signatureValid) {
    return NextResponse.json(INVALID_RESPONSE);
  }

  const round = (Array.isArray(ticket.rounds) ? ticket.rounds[0] : ticket.rounds) as {
    name: string;
    status: string;
    winning_number: string | null;
    winner_ticket_id: string | null;
  } | null;
  const agent = (Array.isArray(ticket.profiles) ? ticket.profiles[0] : ticket.profiles) as {
    display_name: string;
  } | null;

  const ticketStatus: "valid" | "revoked" = ticket.status === "active" ? "valid" : "revoked";

  const roundDrawn = round?.status === "drawn";
  const drawOutcome: "pending" | "winner" | "not_winner" =
    ticketStatus === "valid" && roundDrawn
      ? round?.winner_ticket_id === ticket.id
        ? "winner"
        : "not_winner"
      : "pending";

  return NextResponse.json({
    valid: ticketStatus === "valid",
    status: ticketStatus,
    drawOutcome,
    message:
      ticketStatus === "valid"
        ? undefined
        : ticket.status === "voided"
          ? "Ticket has been voided"
          : "Ticket is not active",
    roundStatus: round?.status ?? "unknown",
    roundName: round?.name,
    number: ticket.number,
    buyerNameMasked: maskName(ticket.buyer_name),
    buyerContactMasked: maskContact(ticket.buyer_contact),
    agentName: agent?.display_name,
    issuedAt: ticket.issued_at,
    winningNumber: round?.winning_number,
  });
}
