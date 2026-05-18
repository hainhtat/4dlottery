import { NextResponse } from "next/server";
import { rateLimitResponse } from "@/lib/api/rate-limit-response";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roundId = searchParams.get("roundId");
  const number = searchParams.get("number");

  if (!roundId || number === null || number === "") {
    return NextResponse.json({ error: "roundId and number required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = user.app_metadata?.role as string | undefined;
  if (role !== "agent" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const limited = await enforceRateLimit("check-number", user.id);
  if (!limited.ok) {
    return rateLimitResponse(limited.retryAfterSec);
  }

  const { data, error } = await supabase.rpc("check_number_available", {
    p_round_id: roundId,
    p_number: number,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
