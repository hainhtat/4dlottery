import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl, supabaseConfigError } from "@/lib/supabase/env";

export async function POST(request: Request) {
  const configErr = supabaseConfigError();
  if (configErr) {
    return NextResponse.json({ error: configErr }, { status: 503 });
  }

  let email: string;
  let password: string;
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    email = String(body.email ?? "").trim();
    password = String(body.password ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Route Handler — setAll may fail in some edge cases; session still returned
        }
      },
    },
  });

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const role = data.user?.app_metadata?.role as string | undefined;
    return NextResponse.json({ role: role ?? null });
  } catch (e) {
    const message =
      e instanceof TypeError && e.message.includes("fetch")
        ? "Cannot reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL, your network, and that the project is running."
        : e instanceof Error
          ? e.message
          : "Sign in failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
