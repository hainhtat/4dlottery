import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { listAllAuthUsers } from "@/lib/supabase/list-auth-users";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const authUsers = await listAllAuthUsers(admin);
  const agents = authUsers.filter((u) => u.app_metadata?.role === "agent");
  const emailById = new Map(agents.map((u) => [u.id, u.email ?? ""]));
  const agentIds = agents.map((u) => u.id);

  if (!agentIds.length) {
    return NextResponse.json({ profiles: [] });
  }

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("*")
    .in("id", agentIds)
    .order("display_name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const withEmail = (profiles ?? []).map((p) => ({
    ...p,
    email: emailById.get(p.id) ?? "",
  }));

  return NextResponse.json({ profiles: withEmail });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = auth.user;

  const body = await request.json();
  const { email, password, displayName, phone, commissionRate } = body as {
    email: string;
    password: string;
    displayName: string;
    phone?: string;
    commissionRate?: number;
  };

  const admin = createAdminClient();

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "agent" },
    user_metadata: { display_name: displayName },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      display_name: displayName,
      phone: phone ?? null,
      commission_rate: commissionRate ?? 5,
    })
    .eq("id", authUser.user.id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  await admin.from("audit_events").insert({
    entity_type: "profile",
    entity_id: authUser.user.id,
    action: "agent_created",
    actor_id: user.id,
    payload: { email, displayName },
  });

  return NextResponse.json({ id: authUser.user.id });
}
