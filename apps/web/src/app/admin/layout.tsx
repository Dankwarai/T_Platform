import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Single role gate for the whole /admin section, unlike tailor/supplier-only
// pages elsewhere which each repeat their own client-side check — every
// admin page shares this layout, so gating once here avoids repeating the
// same check five times, and a Server Component redirect() never briefly
// renders anything before redirecting (unlike a client-side
// router.replace()), which matters more for admin-sensitive data.
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col bg-slate-50 dark:bg-slate-900">
      <nav className="flex gap-4 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
        <Link
          href="/admin"
          className="text-sm font-medium text-slate-700 hover:text-accent dark:text-slate-300"
        >
          Overview
        </Link>
        <Link
          href="/admin/users"
          className="text-sm font-medium text-slate-700 hover:text-accent dark:text-slate-300"
        >
          Users
        </Link>
        <Link
          href="/admin/reviews"
          className="text-sm font-medium text-slate-700 hover:text-accent dark:text-slate-300"
        >
          Reviews
        </Link>
        <Link
          href="/admin/products"
          className="text-sm font-medium text-slate-700 hover:text-accent dark:text-slate-300"
        >
          Products
        </Link>
        <Link
          href="/admin/settings"
          className="text-sm font-medium text-slate-700 hover:text-accent dark:text-slate-300"
        >
          Settings
        </Link>
      </nav>
      <div className="flex flex-1 flex-col items-center px-6 py-10">
        <div className="flex w-full max-w-2xl flex-col gap-6">{children}</div>
      </div>
    </div>
  );
}
