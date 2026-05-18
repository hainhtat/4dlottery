/** Public Supabase config (safe for browser). */
export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

/** Publishable (preferred) or legacy anon key. */
export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    ""
  );
}

export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return Boolean(url && key && /^https?:\/\//i.test(url));
}

export function supabaseConfigError(): string | null {
  if (!getSupabaseUrl()) {
    return "Missing NEXT_PUBLIC_SUPABASE_URL in .env.local";
  }
  if (!getSupabaseAnonKey()) {
    return "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env.local";
  }
  if (!/^https?:\/\//i.test(getSupabaseUrl())) {
    return "NEXT_PUBLIC_SUPABASE_URL must start with http:// or https://";
  }
  return null;
}
