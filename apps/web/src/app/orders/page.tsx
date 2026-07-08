"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type OrderRow = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  supplier_profiles: { business_name: string } | null;
  buyer: { full_name: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function OrdersListPage() {
  const [role, setRole] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      setRole(profile?.role ?? null);

      // RLS already scopes this to orders the user participates in, either
      // as the buyer or the receiving supplier.
      const { data } = await supabase
        .from("orders")
        .select(
          "id, status, total_amount, created_at, buyer_id, supplier_profiles(business_name)",
        )
        .order("created_at", { ascending: false });

      const rows = (data ?? []) as unknown as (OrderRow & {
        buyer_id: string;
      })[];

      // Buyer names aren't embeddable via a direct FK select (orders.buyer_id
      // -> users), so fetch them separately for the supplier's view.
      if (profile?.role === "supplier" && rows.length > 0) {
        const { data: buyers } = await supabase
          .from("users")
          .select("id, full_name")
          .in("id", rows.map((r) => r.buyer_id));
        const byId = new Map((buyers ?? []).map((b) => [b.id, b]));
        rows.forEach((r) => {
          (r as OrderRow).buyer = byId.get(r.buyer_id) ?? null;
        });
      }

      setOrders(rows);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-10 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          {role === "supplier" ? "Orders received" : "My orders"}
        </h1>

        {loading ? (
          <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
        ) : orders.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">No orders yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="flex items-center justify-between rounded-md border border-black/[.08] bg-white p-4 transition-colors hover:bg-black/[.02] dark:border-white/[.145] dark:bg-black dark:hover:bg-white/[.03]"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-black dark:text-zinc-50">
                      {role === "supplier"
                        ? order.buyer?.full_name
                        : order.supplier_profiles?.business_name}
                    </span>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {order.total_amount} ·{" "}
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="text-sm text-zinc-500">
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
