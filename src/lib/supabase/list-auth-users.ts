import type { User } from "@supabase/supabase-js";
import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

const PAGE_SIZE = 200;

/** Paginate through all Auth users (GoTrue default page is ~50). */
export async function listAllAuthUsers(admin: AdminClient): Promise<User[]> {
  const users: User[] = [];
  let page = 1;

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw error;

    const batch = data.users ?? [];
    users.push(...batch);

    if (batch.length < PAGE_SIZE) break;
    page += 1;
  }

  return users;
}
