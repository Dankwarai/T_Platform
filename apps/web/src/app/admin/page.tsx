import { createClient } from "@/lib/supabase/server";

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [
    { count: tailorCount },
    { count: customerCount },
    { count: supplierCount },
    { count: jobCount },
    { count: orderCount },
    { count: reviewCount },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "tailor"),
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "customer"),
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "supplier"),
    supabase.from("jobs").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("reviews").select("*", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "Tailors", value: tailorCount ?? 0 },
    { label: "Customers", value: customerCount ?? 0 },
    { label: "Suppliers", value: supplierCount ?? 0 },
    { label: "Jobs", value: jobCount ?? 0 },
    { label: "Orders", value: orderCount ?? 0 },
    { label: "Tailor reviews", value: reviewCount ?? 0 },
  ];

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-50">
        Admin overview
      </h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="text-2xl font-semibold text-slate-800 dark:text-slate-50">
              {stat.value}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
