"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="h-10 rounded-full border border-solid border-slate-200 px-4 text-sm transition-colors hover:border-transparent hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
    >
      Log out
    </button>
  );
}
