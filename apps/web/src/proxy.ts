import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// `middleware.ts` was renamed to `proxy.ts` in this Next.js version —
// see AGENTS.md. Runs on every request (per matcher below) to refresh the
// Supabase session cookie and gate access to protected routes.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
