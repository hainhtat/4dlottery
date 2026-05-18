/**
 * Delete all lottery data but keep auth users + profiles (admin/agent logins).
 * Usage: npm run reset:data
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Uses reset_lottery_data() RPC (migration 20260518000022) to bypass round draw guards.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./load-env.mjs";

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("Resetting lottery data (keeping auth users and profiles)…\n");

  const { error } = await supabase.rpc("reset_lottery_data");

  if (error) {
    if (error.message?.includes("Could not find the function")) {
      console.error(
        "Failed: reset_lottery_data RPC missing — run: supabase db push\n" +
          "  (migration 20260518000022_reset_lottery_data.sql)"
      );
    } else {
      console.error(`Failed: ${error.message}`);
    }
    process.exit(1);
  }

  console.log("  ✓ reset_lottery_data");

  const { count: profileCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  const { data: users } = await supabase.auth.admin.listUsers();
  console.log(`\nDone. Profiles: ${profileCount ?? 0}, auth users: ${users?.users?.length ?? 0}`);
  console.log("Next round created by admin will be named Round 1.");
}

main();
