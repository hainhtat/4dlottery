import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRoleFromUser } from "@/lib/auth/roles";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = getRoleFromUser(user);
  if (role === "admin") redirect("/admin/dashboard");
  if (role === "agent") redirect("/agent/sell");
  redirect("/login");
}
