import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { listAllAuthUsers } from "@/lib/supabase/list-auth-users";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { password } = body as { password?: string };

  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const users = await listAllAuthUsers(admin);
  const agentUser = users.find((u) => u.id === id && u.app_metadata?.role === "agent");

  if (!agentUser) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const { error } = await admin.auth.admin.updateUserById(id, { password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await admin.from("audit_events").insert({
    entity_type: "profile",
    entity_id: id,
    action: "agent_password_reset",
    actor_id: auth.user.id,
    payload: { email: agentUser.email },
  });

  return NextResponse.json({ ok: true });
}
