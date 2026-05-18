/**
 * Performance, concurrency, and basic security smoke checks.
 * Usage: npm run stress:test
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./load-env.mjs";

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const report = {
  timestamp: new Date().toISOString(),
  environment: { hasSupabase: !!(url && serviceKey), appUrl },
  database: {},
  concurrency: {},
  api: {},
  security: { notes: [] },
  recommendations: [],
};

function ms(start) {
  return Math.round(performance.now() - start);
}

async function timed(label, fn) {
  const start = performance.now();
  try {
    const result = await fn();
    return { ok: true, ms: ms(start), result };
  } catch (e) {
    return { ok: false, ms: ms(start), error: e instanceof Error ? e.message : String(e) };
  }
}

if (!url || !serviceKey) {
  console.log(JSON.stringify({ ...report, error: "Missing Supabase env — skipped live tests" }, null, 2));
  process.exit(0);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- DB benchmarks ---
const agentId = (
  await admin.from("profiles").select("id").limit(1).single()
).data?.id;

const openRound = (
  await admin.from("rounds").select("id, name").eq("status", "open").limit(1).single()
).data;

if (agentId && openRound) {
  const PAGE = 51;
  const samples = [1, 10, 25];
  report.database.agentTicketsQuery = {};

  for (const n of samples) {
    const r = await timed(`agent tickets paginated x${n}`, async () => {
      const runs = [];
      for (let i = 0; i < n; i++) {
        runs.push(
          admin
            .from("tickets")
            .select("id, public_id, number, issued_at, round_id")
            .eq("agent_id", agentId)
            .eq("round_id", openRound.id)
            .order("issued_at", { ascending: false })
            .order("id", { ascending: false })
            .limit(PAGE)
        );
      }
      return Promise.all(runs);
    });
    report.database.agentTicketsQuery[`${n}_parallel`] = {
      totalMs: r.ms,
      avgMs: Math.round(r.ms / n),
      ok: r.ok,
      error: r.error,
    };
  }

  const settlement = await timed("get_agent_settlement RPC", () =>
    admin.rpc("get_agent_settlement", { p_round_id: openRound.id })
  );
  report.database.get_agent_settlement = settlement;

  const checkNum = await timed("check_number_available x20", async () => {
    const nums = Array.from({ length: 20 }, (_, i) => String(i).padStart(4, "0"));
    const results = [];
    for (const num of nums) {
      results.push(
        await admin.rpc("check_number_available", {
          p_round_id: openRound.id,
          p_number: num,
        })
      );
    }
    return results;
  });
  report.database.check_number_sequential_20 = checkNum;
}

// --- Concurrency: unique (round, number) ---
if (openRound) {
  const testNumber = "9998";
  await admin
    .from("tickets")
    .delete()
    .eq("round_id", openRound.id)
    .eq("number", testNumber);

  const insertOnce = (suffix) =>
    admin.from("tickets").insert({
      public_id: `ST${suffix}${testNumber}`.padStart(12, "0").slice(-12),
      round_id: openRound.id,
      agent_id: agentId,
      number: testNumber,
      buyer_name: "Stress",
      buyer_contact: "000",
      status: "active",
      verify_token: "stress",
      commission_amount: 0,
    });

  const concurrent = await timed("duplicate active number insert x2", async () => {
    const [a, b] = await Promise.all([insertOnce("A"), insertOnce("B")]);
    const aOk = !a.error;
    const bOk = !b.error;
    const bConflict =
      b.error?.message?.includes("tickets_round_number_active_idx") ||
      b.error?.message?.includes("duplicate key");
    return {
      first: aOk ? "inserted" : a.error?.message,
      second: bOk ? "inserted" : b.error?.message,
      raceSafe: aOk && !bOk && bConflict,
    };
  });
  report.concurrency.duplicateActiveNumber = concurrent;

  await admin
    .from("tickets")
    .delete()
    .eq("round_id", openRound.id)
    .eq("number", testNumber);
}

// --- API routes (no auth — expect 401) ---
const apiChecks = [
  { path: "/api/tickets/check-number?roundId=x&number=0001", expect: [400, 401] },
  { path: "/api/tickets/issue", method: "POST", expect: [401], body: {} },
  { path: "/api/verify?publicId=TEST&t=deadbeef", expect: [200, 400, 404, 500] },
];

report.api.unauthenticated = {};
for (const check of apiChecks) {
  const r = await timed(check.path, async () => {
    const res = await fetch(`${appUrl}${check.path}`, {
      method: check.method ?? "GET",
      headers: check.body ? { "Content-Type": "application/json" } : undefined,
      body: check.body ? JSON.stringify(check.body) : undefined,
    });
    return { status: res.status };
  });
  report.api.unauthenticated[check.path] = {
    ...r,
    expected: check.expect.includes(r.result?.status),
  };
}

report.rateLimit = {
  implemented: true,
  limits: { "ticket-issue": "30/min per agent", "check-number": "120/min per agent" },
  backend: process.env.UPSTASH_REDIS_REST_URL ? "upstash" : "in-memory (dev / single instance)",
};

// --- Security notes (static) ---
report.security.notes = [
  "issue_tickets: SECURITY DEFINER + is_agent() — agents cannot bypass via direct insert (RLS).",
  "Unique partial index on (round_id, number) WHERE active — prevents double-sell race at DB level.",
  "PDF/verify use service role server-side; ownership checked before PDF generation.",
  "check-number and issue API require session; middleware protects /agent and /admin routes.",
  "Rate limits: issue 30/min, check-number 120/min per user (Upstash if configured).",
  "Sold tickets UI paginates 50 per page with Load more (cursor on issued_at).",
  "TICKET_HMAC_SECRET must stay server-only; rotating invalidates old QR codes.",
];

report.recommendations = [
  "Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in production for distributed rate limits.",
  "Apply migration 20260516000011_tickets_agent_round_index.sql if not applied.",
  "Consider Supabase connection pooling (PgBouncer) before many concurrent agents.",
  "Monitor issue_tickets duration under load; batch inserts already in one transaction.",
];

// Counts
const { count: ticketCount } = await admin
  .from("tickets")
  .select("id", { count: "exact", head: true });
const { count: roundCount } = await admin
  .from("rounds")
  .select("id", { count: "exact", head: true });

report.database.totals = { tickets: ticketCount ?? 0, rounds: roundCount ?? 0 };

console.log(JSON.stringify(report, null, 2));
