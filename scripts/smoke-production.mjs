/**
 * Pre-launch smoke checks against configured Supabase (reads .env.local).
 *
 * Usage:
 *   npm run smoke:production
 *   SMOKE_BASE_URL=https://your-app.vercel.app npm run smoke:production
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./load-env.mjs";

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const hmac = process.env.TICKET_HMAC_SECRET?.trim();
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
const baseUrl = process.env.SMOKE_BASE_URL?.trim()?.replace(/\/$/, "");

const REQUIRED_RPCS = [
  "set_round_status",
  "draw_round",
  "issue_tickets",
  "apply_verify_tokens_for_batch",
  "get_agent_settlement",
  "get_round_agent_settlement",
  "check_number_available",
];

let failed = 0;

function pass(msg) {
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  console.error(`  ✗ ${msg}`);
  failed += 1;
}

function warn(msg) {
  console.warn(`  ! ${msg}`);
}

console.log("\n=== Production smoke checks ===\n");

console.log("Environment:");
if (url) pass("NEXT_PUBLIC_SUPABASE_URL");
else fail("NEXT_PUBLIC_SUPABASE_URL missing");

if (anonKey) pass("Supabase anon/publishable key");
else fail("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or ANON_KEY missing");

if (serviceKey) pass("SUPABASE_SERVICE_ROLE_KEY");
else fail("SUPABASE_SERVICE_ROLE_KEY missing");

if (hmac && hmac.length >= 32) pass("TICKET_HMAC_SECRET (length ok)");
else fail("TICKET_HMAC_SECRET missing or too short (use npm run secret:hmac)");

if (appUrl && /^https:\/\//i.test(appUrl)) pass(`NEXT_PUBLIC_APP_URL=${appUrl}`);
else if (appUrl) warn(`NEXT_PUBLIC_APP_URL should be https in production: ${appUrl}`);
else fail("NEXT_PUBLIC_APP_URL missing");

if (upstashUrl && upstashToken) pass("Upstash rate limit configured");
else warn("UPSTASH_REDIS_* not set — production will fail closed on rate-limited routes");

if (process.env.SENTRY_DSN?.trim()) pass("SENTRY_DSN set");
else warn("SENTRY_DSN not set — error monitoring disabled");

if (!url || !serviceKey) {
  console.log("\nFix env vars in .env.local (or CI secrets) and re-run.\n");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log("\nDatabase RPCs:");
for (const rpc of REQUIRED_RPCS) {
  const { error } = await admin.rpc(rpc, rpcArgs(rpc));
  if (error?.message?.includes("Could not find the function")) {
    fail(`${rpc} — run supabase db push (migration 00018+)`);
  } else {
    pass(`${rpc} exists`);
  }
}

console.log("\nSchema:");
const { count: roundCount, error: roundErr } = await admin
  .from("rounds")
  .select("id", { count: "exact", head: true });
if (roundErr) fail(`rounds table: ${roundErr.message}`);
else pass(`rounds reachable (${roundCount ?? 0} rows)`);

const { error: profileErr } = await admin.from("profiles").select("id").limit(1);
if (profileErr) fail(`profiles: ${profileErr.message}`);
else pass("profiles reachable");

if (baseUrl) {
  console.log(`\nHTTP (${baseUrl}):`);
  try {
    const health = await fetch(`${baseUrl}/login`, { redirect: "manual" });
    if (health.status >= 200 && health.status < 400) pass("GET /login responds");
    else fail(`GET /login status ${health.status}`);
  } catch (e) {
    fail(`GET /login: ${e instanceof Error ? e.message : e}`);
  }

  try {
    const manifest = await fetch(`${baseUrl}/manifest.webmanifest`);
    if (manifest.ok) pass("GET /manifest.webmanifest");
    else fail(`manifest status ${manifest.status}`);
  } catch (e) {
    fail(`manifest: ${e instanceof Error ? e.message : e}`);
  }
} else {
  warn("Set SMOKE_BASE_URL=https://your-domain.com to test deployed HTTP");
}

console.log(failed ? `\n${failed} check(s) failed.\n` : "\nAll critical checks passed.\n");
process.exit(failed ? 1 : 0);

function rpcArgs(name) {
  switch (name) {
    case "set_round_status":
      return {
        p_round_id: "00000000-0000-0000-0000-000000000001",
        p_status: "draft",
      };
    case "draw_round":
      return {
        p_round_id: "00000000-0000-0000-0000-000000000001",
        p_winning_number: "0000",
      };
    case "issue_tickets":
      return {
        p_round_id: "00000000-0000-0000-0000-000000000001",
        p_buyer_name: "smoke",
        p_buyer_contact: "0",
        p_numbers: ["0000"],
      };
    case "apply_verify_tokens_for_batch":
      return {
        p_batch_id: "00000000-0000-0000-0000-000000000001",
        p_updates: [],
      };
    case "get_agent_settlement":
      return { p_round_id: null };
    case "get_round_agent_settlement":
      return { p_round_id: "00000000-0000-0000-0000-000000000001" };
    case "check_number_available":
      return {
        p_round_id: "00000000-0000-0000-0000-000000000001",
        p_number: "0000",
      };
    default:
      return {};
  }
}
