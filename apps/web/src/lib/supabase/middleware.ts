import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@t-flatform/supabase-client";

const PROTECTED_PATHS = [
  "/dashboard",
  "/profile",
  "/tailors",
  "/measurements",
  "/rankings",
  "/suggestions",
  "/tailor",
  "/jobs",
  "/supplier",
  "/products",
  "/orders",
  "/customer",
];
const AUTH_ONLY_PATHS = ["/login", "/signup"];

// Called from proxy.ts on every request: refreshes the auth cookie and
// does an optimistic redirect based on session presence. This is a fast
// cookie-only check, not a source of truth — real authorization still
// happens per-request via RLS and server-side session checks.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (!user && PROTECTED_PATHS.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && AUTH_ONLY_PATHS.includes(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
