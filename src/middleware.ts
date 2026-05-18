import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasValidCsrf } from "@/lib/api/csrf";
import { getRoleFromUser } from "@/lib/auth/roles";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/api/") && MUTATING_METHODS.has(request.method) && !hasValidCsrf(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = getRoleFromUser(user);

  if (path.startsWith("/admin") || path.startsWith("/agent")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (!role) {
      const login = new URL("/login", request.url);
      login.searchParams.set("reason", "no_role");
      return NextResponse.redirect(login);
    }
  }

  if (path.startsWith("/admin")) {
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/agent/sell", request.url));
    }
  }

  if (path.startsWith("/agent")) {
    if (role !== "agent") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
  }

  if (path === "/login" && user) {
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    if (role === "agent") {
      return NextResponse.redirect(new URL("/agent/sell", request.url));
    }
    if (!role) {
      const login = new URL("/login", request.url);
      login.searchParams.set("reason", "no_role");
      return NextResponse.redirect(login);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/admin/:path*", "/agent/:path*", "/login", "/api/:path*"],
};
