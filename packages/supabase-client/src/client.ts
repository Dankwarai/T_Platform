import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Accepts url/anonKey as params rather than reading env vars directly,
// since Next.js (NEXT_PUBLIC_*) and Expo (EXPO_PUBLIC_*) expose env vars
// differently — each app supplies its own at the call site.
//
// Falls back to a placeholder instead of throwing when unset, so the app
// can still boot before a real Supabase project is wired up (createClient
// itself throws on an empty url). Calls will fail at the point of use
// instead of crashing on import.
export function createSupabaseClient(
  url: string,
  anonKey: string,
): SupabaseClient<Database> {
  if (!url || !anonKey) {
    console.warn(
      "createSupabaseClient: url/anonKey not set — using a placeholder. " +
        "Supabase calls will fail until real credentials are provided.",
    );
  }
  return createClient<Database>(
    url || "https://placeholder.supabase.co",
    anonKey || "placeholder-anon-key",
  );
}

export type { SupabaseClient };
