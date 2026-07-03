"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Job = {
  id: string;
  status: string;
  price: number | null;
  price_type: string | null;
  payment_status: string;
  due_date: string | null;
  fitting_iteration_count: number;
  fit_confirmation: string | null;
  tailor_id: string;
  garment_type_id: string;
  tailor_profiles: { user_id: string; business_name: string } | null;
  garment_types: { name: string } | null;
  measurement_records: {
    label: string;
    customer_id: string;
    customer_profiles: {
      user_id: string;
      users: { full_name: string } | null;
    } | null;
  } | null;
};

type HistoryEntry = {
  from_status: string | null;
  to_status: string;
  created_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  requested: "Requested",
  accepted: "Accepted",
  rejected: "Rejected",
  in_progress: "In progress",
  ready_for_fitting: "Ready for fitting",
  adjusting: "Adjusting",
  completed: "Completed",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [standardPrice, setStandardPrice] = useState<number | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [useStandard, setUseStandard] = useState(true);
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

    const { data: jobData } = await supabase
      .from("jobs")
      .select(
        "id, status, price, price_type, payment_status, due_date, fitting_iteration_count, fit_confirmation, tailor_id, garment_type_id, tailor_profiles(user_id, business_name), garment_types(name), measurement_records(label, customer_id, customer_profiles(user_id, users(full_name)))",
      )
      .eq("id", id)
      .single();

    setJob(jobData as unknown as Job);

    if (jobData) {
      const { data: priceData } = await supabase
        .from("tailor_service_prices")
        .select("price")
        .eq("tailor_id", jobData.tailor_id)
        .eq("garment_type_id", jobData.garment_type_id)
        .maybeSingle();
      setStandardPrice(priceData?.price ?? null);
    }

    const { data: historyData } = await supabase
      .from("job_status_history")
      .select("from_status, to_status, created_at")
      .eq("job_id", id)
      .order("created_at", { ascending: true });
    setHistory(historyData ?? []);

    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateJob(fields: Record<string, unknown>) {
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("jobs")
      .update(fields)
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setPending(false);
      return;
    }
    await load();
    setPending(false);
  }

  async function handleAccept(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const price = useStandard ? standardPrice : Number(priceInput);
    if (price === null || Number.isNaN(price)) {
      setError("Enter a price.");
      return;
    }
    await updateJob({
      status: "accepted",
      price,
      price_type: useStandard ? "standard" : "custom",
    });
  }

  async function handleFitConfirmation(value: "yes" | "somewhat" | "no") {
    if (!job) return;
    if (value === "yes") {
      await updateJob({
        status: "completed",
        fit_confirmation: value,
        completed_at: new Date().toISOString(),
      });
    } else {
      await updateJob({
        status: "adjusting",
        fit_confirmation: value,
        fitting_iteration_count: job.fitting_iteration_count + 1,
      });
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-zinc-600 dark:text-zinc-400">Job not found.</p>
      </div>
    );
  }

  const isTailor = job.tailor_profiles?.user_id === currentUserId;
  const isCustomer =
    job.measurement_records?.customer_profiles?.user_id === currentUserId;
  const counterpartName = isTailor
    ? job.measurement_records?.customer_profiles?.users?.full_name
    : job.tailor_profiles?.business_name;

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-10 dark:bg-black">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          {job.measurement_records?.label} · {job.garment_types?.name}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          {isTailor ? "Customer" : "Tailor"}: {counterpartName ?? "Unknown"}
        </p>
        <p className="text-zinc-600 dark:text-zinc-400">
          Status: {STATUS_LABELS[job.status] ?? job.status}
          {job.due_date ? ` · due ${job.due_date}` : ""}
        </p>
        {job.price !== null && (
          <p className="text-zinc-600 dark:text-zinc-400">
            Price: {job.price} ({job.price_type}) · {job.payment_status}
          </p>
        )}
        {job.fitting_iteration_count > 0 && (
          <p className="text-sm text-zinc-500">
            Fitting adjustments so far: {job.fitting_iteration_count}
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* requested */}
        {job.status === "requested" && isTailor && (
          <form
            onSubmit={handleAccept}
            className="flex flex-col gap-3 rounded-md border border-black/[.08] p-4 dark:border-white/[.145]"
          >
            <h3 className="font-medium text-black dark:text-zinc-50">
              Accept this request
            </h3>
            {standardPrice !== null && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={useStandard}
                  onChange={() => setUseStandard(true)}
                />
                Use standard price ({standardPrice})
              </label>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={!useStandard}
                onChange={() => setUseStandard(false)}
              />
              Custom price
            </label>
            {!useStandard && (
              <input
                type="number"
                min={0}
                step="0.01"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                className="rounded-md border border-black/[.08] bg-white px-3 py-2 text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
              />
            )}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={pending}
                className="h-10 flex-1 rounded-full bg-foreground px-5 text-sm text-background disabled:opacity-50"
              >
                Accept
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => updateJob({ status: "rejected" })}
                className="h-10 rounded-full border border-red-600 px-4 text-sm text-red-600"
              >
                Reject
              </button>
            </div>
          </form>
        )}
        {job.status === "requested" && isCustomer && (
          <button
            disabled={pending}
            onClick={() => updateJob({ status: "cancelled" })}
            className="h-10 rounded-full border border-red-600 px-4 text-sm text-red-600"
          >
            Cancel request
          </button>
        )}

        {/* accepted */}
        {job.status === "accepted" && isTailor && (
          <button
            disabled={pending}
            onClick={() => updateJob({ status: "in_progress" })}
            className="h-11 rounded-full bg-foreground px-5 text-background disabled:opacity-50"
          >
            Start work
          </button>
        )}
        {job.status === "accepted" && isCustomer && (
          <button
            disabled={pending}
            onClick={() => updateJob({ status: "cancelled" })}
            className="h-10 rounded-full border border-red-600 px-4 text-sm text-red-600"
          >
            Cancel
          </button>
        )}

        {/* in_progress */}
        {job.status === "in_progress" && isTailor && (
          <button
            disabled={pending}
            onClick={() => updateJob({ status: "ready_for_fitting" })}
            className="h-11 rounded-full bg-foreground px-5 text-background disabled:opacity-50"
          >
            Mark ready for fitting
          </button>
        )}

        {/* ready_for_fitting */}
        {job.status === "ready_for_fitting" && (isTailor || isCustomer) && (
          <div className="flex flex-col gap-2 rounded-md border border-black/[.08] p-4 dark:border-white/[.145]">
            <h3 className="font-medium text-black dark:text-zinc-50">
              How did the fitting go?
            </h3>
            <div className="flex gap-2">
              <button
                disabled={pending}
                onClick={() => handleFitConfirmation("yes")}
                className="h-10 flex-1 rounded-full bg-foreground px-3 text-sm text-background disabled:opacity-50"
              >
                Fits well
              </button>
              <button
                disabled={pending}
                onClick={() => handleFitConfirmation("somewhat")}
                className="h-10 flex-1 rounded-full border border-black/[.08] px-3 text-sm dark:border-white/[.145]"
              >
                Needs adjustment
              </button>
              <button
                disabled={pending}
                onClick={() => handleFitConfirmation("no")}
                className="h-10 flex-1 rounded-full border border-black/[.08] px-3 text-sm dark:border-white/[.145]"
              >
                Doesn't fit
              </button>
            </div>
          </div>
        )}

        {/* adjusting */}
        {job.status === "adjusting" && isTailor && (
          <button
            disabled={pending}
            onClick={() => updateJob({ status: "ready_for_fitting" })}
            className="h-11 rounded-full bg-foreground px-5 text-background disabled:opacity-50"
          >
            Mark adjustments done
          </button>
        )}

        {/* completed */}
        {job.status === "completed" && isTailor && (
          <button
            disabled={pending}
            onClick={() => updateJob({ status: "delivered" })}
            className="h-11 rounded-full bg-foreground px-5 text-background disabled:opacity-50"
          >
            Mark delivered
          </button>
        )}

        <div className="mt-4 flex flex-col gap-2">
          <h3 className="font-medium text-black dark:text-zinc-50">
            History
          </h3>
          <ul className="flex flex-col gap-1 text-sm text-zinc-500">
            {history.map((h, i) => (
              <li key={i}>
                {h.from_status
                  ? `${STATUS_LABELS[h.from_status] ?? h.from_status} → ${STATUS_LABELS[h.to_status] ?? h.to_status}`
                  : `Created as ${STATUS_LABELS[h.to_status] ?? h.to_status}`}
                {" — "}
                {new Date(h.created_at).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
