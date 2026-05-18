import { createClient } from "@/lib/supabase/server";
import { getRoleFromUser } from "@/lib/auth/roles";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || getRoleFromUser(user) !== "admin") {
    return { ok: false as const, user: null };
  }

  return { ok: true as const, user };
}
