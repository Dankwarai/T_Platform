"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PayButton } from "@/components/PayButton";

type Order = {
  id: string;
  status: string;
  fulfillment_type: string;
  payment_method: string;
  payment_status: string;
  total_amount: number;
  platform_fee_amount: number;
  buyer_id: string;
  supplier_id: string;
  supplier_profiles: { user_id: string; business_name: string } | null;
};

type OrderItem = {
  id: string;
  quantity: number;
  unit_price_at_purchase: number;
  subtotal: number;
  product_variants: {
    variant_name: string;
    unit_type: string;
    products: { id: string; name: string } | null;
  } | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [buyerName, setBuyerName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    setCurrentUserId(user.id);

    const { data: orderData } = await supabase
      .from("orders")
      .select(
        "id, status, fulfillment_type, payment_method, payment_status, total_amount, platform_fee_amount, buyer_id, supplier_id, supplier_profiles(user_id, business_name)",
      )
      .eq("id", id)
      .single();

    setOrder(orderData as unknown as Order);

    if (orderData) {
      const { data: buyer } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", orderData.buyer_id)
        .single();
      setBuyerName(buyer?.full_name ?? null);
    }

    const { data: itemsData } = await supabase
      .from("order_items")
      .select(
        "id, quantity, unit_price_at_purchase, subtotal, product_variants(variant_name, unit_type, products(id, name))",
      )
      .eq("order_id", id);
    setItems((itemsData as unknown as OrderItem[]) ?? []);

    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(status: string) {
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setPending(false);
      return;
    }
    await load();
    setPending(false);
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
        <p className="text-slate-600 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
        <p className="text-slate-600 dark:text-slate-400">Order not found.</p>
      </div>
    );
  }

  const isSupplier = order.supplier_profiles?.user_id === currentUserId;
  const isBuyer = order.buyer_id === currentUserId;

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-6 py-10 dark:bg-slate-900">
      <div className="flex w-full max-w-lg flex-col gap-4">
        <Link
          href="/orders"
          className="text-sm text-slate-600 underline dark:text-slate-400"
        >
          ← Back to orders
        </Link>

        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-50">
          Order {STATUS_LABELS[order.status] ?? order.status}
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          {isSupplier ? "Buyer" : "Supplier"}:{" "}
          {isSupplier ? buyerName : order.supplier_profiles?.business_name}
        </p>
        <p className="text-slate-600 dark:text-slate-400">
          {order.fulfillment_type === "local_pickup"
            ? "Local pickup"
            : "Supplier shipping"}
          {" · "}
          {order.payment_method === "in_app" ? "Paid in-app" : "Pay offline"}
          {" · "}
          {order.payment_status}
        </p>

        {isBuyer && (
          <PayButton
            targetType="order"
            targetId={order.id}
            paymentMethod={order.payment_method}
            paymentStatus={order.payment_status}
            onPaid={load}
          />
        )}

        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <Link
                href={`/products/${item.product_variants?.products?.id}`}
                className="underline"
              >
                {item.product_variants?.products?.name} —{" "}
                {item.product_variants?.variant_name}
              </Link>
              <span>
                {item.quantity} {item.product_variants?.unit_type} ×{" "}
                {item.unit_price_at_purchase} = {item.subtotal}
              </span>
            </li>
          ))}
        </ul>

        <p className="text-right font-medium text-slate-800 dark:text-slate-50">
          Total: {order.total_amount}
        </p>

        {isSupplier && (
          <p className="text-right text-sm text-slate-500">
            Platform fee (10%): -{order.platform_fee_amount} · You keep:{" "}
            {(order.total_amount - order.platform_fee_amount).toFixed(2)}
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          {order.status === "pending" && isSupplier && (
            <button
              disabled={pending}
              onClick={() => updateStatus("confirmed")}
              className="h-11 rounded-full bg-accent px-5 text-white disabled:opacity-50"
            >
              Confirm order
            </button>
          )}
          {order.status === "pending" && isBuyer && (
            <button
              disabled={pending}
              onClick={() => updateStatus("cancelled")}
              className="h-10 rounded-full border border-red-600 px-4 text-sm text-red-600"
            >
              Cancel order
            </button>
          )}
          {order.status === "confirmed" && isSupplier && (
            <button
              disabled={pending}
              onClick={() => updateStatus("ready")}
              className="h-11 rounded-full bg-accent px-5 text-white disabled:opacity-50"
            >
              Mark ready
            </button>
          )}
          {order.status === "ready" && isSupplier && (
            <button
              disabled={pending}
              onClick={() => updateStatus("completed")}
              className="h-11 rounded-full bg-accent px-5 text-white disabled:opacity-50"
            >
              Mark completed
            </button>
          )}
        </div>

        {order.status === "completed" && isBuyer && (
          <p className="text-sm text-slate-500">
            Order complete — you can leave a review from each product&apos;s
            page.
          </p>
        )}
      </div>
    </div>
  );
}
