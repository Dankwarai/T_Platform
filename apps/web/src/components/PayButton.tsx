"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function PayButton({
  targetType,
  targetId,
  paymentMethod,
  paymentStatus,
  onPaid,
}: {
  targetType: "job" | "order";
  targetId: string;
  paymentMethod: string | null;
  paymentStatus: string;
  onPaid: () => void;
}) {
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Paystack's callback_url redirect appends `trxref`/`reference` query
  // params. Landing back here doesn't guarantee the webhook has already
  // updated payment_status — poll briefly rather than assume it's instant.
  useEffect(() => {
    if (!searchParams.get("trxref") || paymentStatus === "paid") return;

    setConfirming(true);
    let attempts = 0;
    const interval = setInterval(() => {
      attempts += 1;
      onPaid();
      if (attempts >= 5) {
        clearInterval(interval);
        setConfirming(false);
      }
    }, 2000);

    return () => clearInterval(interval);
    // Only run once on mount for a given return-from-payment landing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (paymentMethod !== "in_app" || paymentStatus === "paid") {
    return null;
  }

  // Jobs pay in two legs (50% deposit, then the remainder); orders are a
  // single full payment, they never reach "deposit_paid".
  const payLabel =
    targetType === "job"
      ? paymentStatus === "deposit_paid"
        ? "Pay remaining balance"
        : "Pay deposit (50%)"
      : "Pay now";

  async function handlePay() {
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke("initialize-payment", {
      body: {
        targetType,
        targetId,
        redirectUrl: window.location.href,
      },
    });

    if (error || !data?.authorization_url) {
      setError(error?.message ?? "Failed to start payment.");
      setPending(false);
      return;
    }

    window.location.href = data.authorization_url;
  }

  if (confirming) {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Confirming payment...
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={handlePay}
        disabled={pending}
        className="h-10 rounded-full bg-accent px-5 text-sm text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {pending ? "Redirecting to checkout..." : payLabel}
      </button>
    </div>
  );
}
