/**
 * Parallel issue_tickets on the same number — second call must fail.
 *
 * Local:
 *   AGENT_JWT=eyJ... npm run test:concurrency
 *
 * CI (GitHub Actions):
 *   CI=true + Supabase secrets + CI_AGENT_EMAIL / CI_AGENT_PASSWORD
 *   (creates CI agent and open round if missing)
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./load-env.mjs";
import {
  ensureOpenRound,
  requireSupabaseEnv,
  resolveAgentJwt,
} from "./lib/ci-agent-session.mjs";

loadEnv();

const isCi = process.env.CI === "true";

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function skip(message) {
  console.log(message);
  process.exit(0);
}

let env;
try {
  env = requireSupabaseEnv();
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  if (isCi) fail(msg);
  skip(`Skip: ${msg}`);
}

const admin = createClient(env.url, env.serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let agentJwt;
try {
  agentJwt = await resolveAgentJwt(env);
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  if (isCi) fail(`Agent session: ${msg}`);
  skip(`Skip: ${msg}`);
}

if (!agentJwt) {
  if (isCi) {
    fail("Set AGENT_JWT or CI_AGENT_EMAIL + CI_AGENT_PASSWORD");
  }
  skip("Set AGENT_JWT to run parallel RPC test (agent session token).");
}

const agent = createClient(env.url, env.anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { headers: { Authorization: `Bearer ${agentJwt}` } },
});

let roundId;
try {
  roundId = await ensureOpenRound(admin);
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  if (isCi) fail(`Open round: ${msg}`);
  skip(`Skip: ${msg}`);
}

const testNumber = String(Math.floor(Math.random() * 10000)).padStart(4, "0");

async function issueOnce(client, label) {
  const { data, error } = await client.rpc("issue_tickets", {
    p_round_id: roundId,
    p_buyer_name: "Concurrency Test",
    p_buyer_contact: "0000000000",
    p_numbers: [testNumber],
  });
  return { label, data, error: error?.message ?? null };
}

console.log(`Testing duplicate number ${testNumber} on round ${roundId}…`);

const [a, b] = await Promise.all([issueOnce(agent, "A"), issueOnce(agent, "B")]);

const successes = [a, b].filter((r) => !r.error);
const failures = [a, b].filter((r) => r.error);

console.log("A:", a.error ?? "ok");
console.log("B:", b.error ?? "ok");

if (successes.length === 1 && failures.length === 1) {
  console.log("PASS: exactly one issue succeeded");
  process.exit(0);
}

fail("FAIL: expected one success and one failure");
