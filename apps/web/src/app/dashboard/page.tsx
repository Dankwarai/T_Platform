import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "tailor") {
    const { data: tailorProfile } = await supabase
      .from("tailor_profiles")
      .select("business_name")
      .eq("user_id", user.id)
      .single();

    if (tailorProfile?.business_name === "") {
      redirect("/profile/complete");
    }
  }

  if (profile?.role === "supplier") {
    const { data: supplierProfile } = await supabase
      .from("supplier_profiles")
      .select("business_name")
      .eq("user_id", user.id)
      .single();

    if (supplierProfile?.business_name === "") {
      redirect("/supplier/profile");
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 dark:bg-black">
      <div className="flex w-full max-w-sm flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          {user.email} · {profile?.role ?? "unknown role"}
        </p>
      </div>
      <Link
        href="/tailors"
        className="h-11 rounded-full bg-foreground px-5 leading-[44px] text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
      >
        Find tailors
      </Link>
      {profile?.role === "customer" && (
        <Link
          href="/measurements"
          className="h-11 rounded-full border border-solid border-black/[.08] px-5 leading-[44px] transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          My measurements
        </Link>
      )}
      {profile?.role === "tailor" && (
        <Link
          href="/tailor/prices"
          className="h-11 rounded-full border border-solid border-black/[.08] px-5 leading-[44px] transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          Set prices
        </Link>
      )}
      <Link
        href="/jobs"
        className="h-11 rounded-full border border-solid border-black/[.08] px-5 leading-[44px] transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
      >
        My jobs
      </Link>
      <Link
        href="/rankings"
        className="h-11 rounded-full border border-solid border-black/[.08] px-5 leading-[44px] transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
      >
        Top tailors
      </Link>
      <Link
        href="/suggestions"
        className="h-11 rounded-full border border-solid border-black/[.08] px-5 leading-[44px] transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
      >
        Suggested tailors
      </Link>
      <Link
        href="/products"
        className="h-11 rounded-full border border-solid border-black/[.08] px-5 leading-[44px] transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
      >
        Browse marketplace
      </Link>
      <Link
        href="/suppliers"
        className="h-11 rounded-full border border-solid border-black/[.08] px-5 leading-[44px] transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
      >
        Find suppliers
      </Link>
      {profile?.role === "supplier" && (
        <Link
          href="/supplier/products"
          className="h-11 rounded-full border border-solid border-black/[.08] px-5 leading-[44px] transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          My products
        </Link>
      )}
      <Link
        href="/orders"
        className="h-11 rounded-full border border-solid border-black/[.08] px-5 leading-[44px] transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
      >
        {profile?.role === "supplier" ? "Orders received" : "My orders"}
      </Link>
      <LogoutButton />
    </div>
  );
}
