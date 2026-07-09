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
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-slate-50 px-6 dark:bg-slate-900">
      <div className="flex w-full max-w-sm flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-50">
          Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          {user.email} · {profile?.role ?? "unknown role"}
        </p>
      </div>
      <Link
        href="/tailors"
        className="h-11 rounded-full bg-accent px-5 leading-[44px] text-white transition-colors hover:bg-accent-hover"
      >
        Find tailors
      </Link>
      {profile?.role === "customer" && (
        <Link
          href="/measurements"
          className="h-11 rounded-full border border-solid border-slate-200 px-5 leading-[44px] transition-colors hover:border-transparent hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          My measurements
        </Link>
      )}
      {profile?.role === "customer" && (
        <Link
          href="/customer/profile"
          className="h-11 rounded-full border border-solid border-slate-200 px-5 leading-[44px] transition-colors hover:border-transparent hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          My profile
        </Link>
      )}
      {profile?.role === "tailor" && (
        <Link
          href="/tailor/prices"
          className="h-11 rounded-full border border-solid border-slate-200 px-5 leading-[44px] transition-colors hover:border-transparent hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Set prices
        </Link>
      )}
      <Link
        href="/jobs"
        className="h-11 rounded-full border border-solid border-slate-200 px-5 leading-[44px] transition-colors hover:border-transparent hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        My jobs
      </Link>
      <Link
        href="/rankings"
        className="h-11 rounded-full border border-solid border-slate-200 px-5 leading-[44px] transition-colors hover:border-transparent hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        Top tailors
      </Link>
      <Link
        href="/suggestions"
        className="h-11 rounded-full border border-solid border-slate-200 px-5 leading-[44px] transition-colors hover:border-transparent hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        Suggested tailors
      </Link>
      <Link
        href="/products"
        className="h-11 rounded-full border border-solid border-slate-200 px-5 leading-[44px] transition-colors hover:border-transparent hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        Browse marketplace
      </Link>
      <Link
        href="/suppliers"
        className="h-11 rounded-full border border-solid border-slate-200 px-5 leading-[44px] transition-colors hover:border-transparent hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        Find suppliers
      </Link>
      {profile?.role === "supplier" && (
        <Link
          href="/supplier/products"
          className="h-11 rounded-full border border-solid border-slate-200 px-5 leading-[44px] transition-colors hover:border-transparent hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          My products
        </Link>
      )}
      <Link
        href="/orders"
        className="h-11 rounded-full border border-solid border-slate-200 px-5 leading-[44px] transition-colors hover:border-transparent hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        {profile?.role === "supplier" ? "Orders received" : "My orders"}
      </Link>
      <LogoutButton />
    </div>
  );
}
