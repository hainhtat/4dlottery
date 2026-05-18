import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { listAllAuthUsers } from "@/lib/supabase/list-auth-users";

async function assertAgentUser(admin: ReturnType<typeof createAdminClient>, id: string) {
  const users = await listAllAuthUsers(admin);
  const authUser = users.find((u) => u.id === id);
  if (!authUser || authUser.app_metadata?.role !== "agent") {
    return null;
  }
  return authUser;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { displayName, phone, commissionRate, isActive } = body as {
    displayName?: string;
    commissionRate?: number;
    phone?: string | null;
    isActive?: boolean;
  };

  const admin = createAdminClient();
  const agentUser = await assertAgentUser(admin, id);
  if (!agentUser) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};

  if (displayName !== undefined) {
    const name = displayName.trim();
    if (!name) {
      return NextResponse.json({ error: "Display name is required" }, { status: 400 });
    }
    updates.display_name = name;
  }

  if (phone !== undefined) {
    updates.phone = phone?.trim() ? phone.trim() : null;
  }

  if (commissionRate !== undefined) {
    const rate = Number(commissionRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      return NextResponse.json({ error: "Commission must be between 0 and 100" }, { status: 400 });
    }
    updates.commission_rate = rate;
  }

  if (isActive !== undefined) {
    updates.is_active = Boolean(isActive);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data: profile, error } = await admin
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (displayName !== undefined) {
    await admin.auth.admin.updateUserById(id, {
      user_metadata: { display_name: displayName.trim() },
    });
  }

  await admin.from("audit_events").insert({
    entity_type: "profile",
    entity_id: id,
    action: "agent_updated",
    actor_id: auth.user.id,
    payload: {
      displayName: updates.display_name,
      phone: updates.phone,
      commission_rate: updates.commission_rate,
      is_active: updates.is_active,
    },
  });

  return NextResponse.json({
    profile: { ...profile, email: agentUser.email ?? "" },
  });
}
