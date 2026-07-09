"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Variant = {
  id: string;
  variant_name: string;
  unit_type: string;
  price: number;
  stock_quantity: number;
};

export function BuyForm({
  supplierId,
  variants,
}: {
  supplierId: string;
  variants: Variant[];
}) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [fulfillmentType, setFulfillmentType] = useState<
    "local_pickup" | "supplier_shipping"
  >("local_pickup");
  const [paymentMethod, setPaymentMethod] = useState<"in_app" | "offline">(
    "offline",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      setVisible(profile?.role === "customer");
    });
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.rpc("create_order", {
      p_supplier_id: supplierId,
      p_fulfillment_type: fulfillmentType,
      p_payment_method: paymentMethod,
      p_items: [{ variant_id: variantId, quantity: Number(quantity) }],
    });

    if (error) {
      setError(error.message);
      setPending(false);
      return;
    }

    setOrderId(data as string);
    setPending(false);
    router.refresh();
  }

  if (!visible) {
    return null;
  }

  if (variants.length === 0) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        Out of stock — no variants available.
      </div>
    );
  }

  if (orderId) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-green-600 dark:border-slate-700 dark:bg-slate-800">
        Order placed — track it from{" "}
        <a href={`/orders/${orderId}`} className="underline">
          My orders
        </a>
        .
      </div>
    );
  }

  const selectedVariant = variants.find((v) => v.id === variantId);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
    >
      <h3 className="font-medium text-slate-800 dark:text-slate-50">Buy</h3>

      <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
        Variant
        <select
          value={variantId}
          onChange={(e) => setVariantId(e.target.value)}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
        >
          {variants.map((v) => (
            <option key={v.id} value={v.id} disabled={v.stock_quantity <= 0}>
              {v.variant_name} — {v.price}/{v.unit_type} (
              {v.stock_quantity} in stock)
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
        Quantity ({selectedVariant?.unit_type})
        <input
          type="number"
          required
          min={0.01}
          step="0.01"
          max={selectedVariant?.stock_quantity}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
        />
      </label>

      <fieldset className="flex gap-4 text-sm text-slate-700 dark:text-slate-300">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={fulfillmentType === "local_pickup"}
            onChange={() => setFulfillmentType("local_pickup")}
          />
          Local pickup
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={fulfillmentType === "supplier_shipping"}
            onChange={() => setFulfillmentType("supplier_shipping")}
          />
          Supplier shipping
        </label>
      </fieldset>

      <fieldset className="flex gap-4 text-sm text-slate-700 dark:text-slate-300">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={paymentMethod === "offline"}
            onChange={() => setPaymentMethod("offline")}
          />
          Pay offline
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={paymentMethod === "in_app"}
            onChange={() => setPaymentMethod("in_app")}
          />
          Pay in-app
        </label>
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="h-10 rounded-full bg-accent px-5 text-sm text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {pending ? "Placing order..." : "Place order"}
      </button>
    </form>
  );
}
