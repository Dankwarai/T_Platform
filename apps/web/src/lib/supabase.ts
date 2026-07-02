import { createSupabaseClient } from "@t-flatform/supabase-client";

export const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);
