import { createClient } from "@supabase/supabase-js";

export function getAnonKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    ""
  );
}

export function requireSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = getAnonKey();
  if (!url || !serviceKey || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and publishable/anon key"
    );
  }
  return { url, serviceKey, anonKey };
}

export async function ensureCiAgent(admin, email, password) {
  const { data: list, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw listError;

  let user = list?.users?.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "agent" },
      user_metadata: { display_name: "CI Agent" },
    });
    if (error) throw error;
    user = data.user;
  } else {
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      app_metadata: { role: "agent" },
      password,
    });
    if (error) throw error;
  }

  await admin
    .from("profiles")
    .update({ display_name: "CI Agent", is_active: true })
    .eq("id", user.id);

  return user.id;
}

export async function signInAgent({ url, anonKey, email, password }) {
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.session?.access_token) {
    throw new Error("Agent sign-in did not return an access token");
  }
  return data.session.access_token;
}

export async function resolveAgentJwt(env) {
  const explicit = process.env.AGENT_JWT?.trim();
  if (explicit) return explicit;

  const email = process.env.CI_AGENT_EMAIL?.trim();
  const password = process.env.CI_AGENT_PASSWORD;
  if (!email || !password) return null;

  const admin = createClient(env.url, env.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await ensureCiAgent(admin, email, password);
  return signInAgent({ url: env.url, anonKey: env.anonKey, email, password });
}

export async function ensureOpenRound(admin) {
  const { data: existing } = await admin
    .from("rounds")
    .select("id")
    .eq("status", "open")
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const now = Date.now();
  const { data: round, error } = await admin
    .from("rounds")
    .insert({
      name: `CI concurrency ${new Date(now).toISOString().slice(0, 10)}`,
      ticket_price: 100,
      prize_amount: 10000,
      opens_at: new Date(now - 3_600_000).toISOString(),
      closes_at: new Date(now + 7 * 86_400_000).toISOString(),
      status: "open",
    })
    .select("id")
    .single();

  if (error) throw error;
  return round.id;
}
