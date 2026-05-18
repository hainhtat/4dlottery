import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRoleFromUser } from "@/lib/auth/roles";
import { listAllAuthUsers } from "@/lib/supabase/list-auth-users";
import { AdminDashboardHeader } from "@/components/admin/AdminDashboardHeader";
import { AdminDashboardSettlement } from "@/components/admin/AdminDashboardSettlement";
import type { Round } from "@/lib/types/database";

export const dynamic = "force-dynamic";

const ROUND_COLUMNS =
  "id, name, ticket_price, prize_amount, opens_at, closes_at, status, winning_number, winner_ticket_id, created_at";

async function loadRounds(admin: ReturnType<typeof createAdminClient>): Promise<Round[]> {
  const { data, error } = await admin
    .from("rounds")
    .select(ROUND_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as Round[];
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || getRoleFromUser(user) !== "admin") {
    redirect("/login?reason=unauthorized");
  }

  const admin = createAdminClient();
  const rounds = await loadRounds(admin);

  let agentCount = 0;
  try {
    const users = await listAllAuthUsers(admin);
    agentCount = users.filter((u) => u.app_metadata?.role === "agent").length;
  } catch {
    agentCount = 0;
  }

  return (
    <>
      <AdminDashboardHeader />
      <AdminDashboardSettlement initialRounds={rounds} initialAgentCount={agentCount} />
    </>
  );
}
