"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type MeasurementRecordOption = {
  id: string;
  label: string;
  garment_type_id: string;
  garment_types: { name: string } | null;
};

export function RequestJobForm({ tailorId }: { tailorId: string }) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [records, setRecords] = useState<MeasurementRecordOption[]>([]);
  const [recordId, setRecordId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"in_app" | "offline">(
    "offline",
  );
  const [standardPrice, setStandardPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
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

      if (profile?.role !== "customer") {
        setLoading(false);
        return;
      }

      const { data: customerProfile } = await supabase
        .from("customer_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!customerProfile) {
        setLoading(false);
        return;
      }

      const { data: myRecords } = await supabase
        .from("measurement_records")
        .select("id, label, garment_type_id, garment_types(name)")
        .eq("customer_id", customerProfile.id)
        .order("created_at", { ascending: false });

      setRecords((myRecords as unknown as MeasurementRecordOption[]) ?? []);
      setVisible(true);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!recordId) {
      setStandardPrice(null);
      return;
    }
    const record = records.find((r) => r.id === recordId);
    if (!record) return;

    const supabase = createClient();
    supabase
      .from("tailor_service_prices")
      .select("price")
      .eq("tailor_id", tailorId)
      .eq("garment_type_id", record.garment_type_id)
      .maybeSingle()
      .then(({ data }) => setStandardPrice(data?.price ?? null));
  }, [recordId, records, tailorId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const record = records.find((r) => r.id === recordId);
    if (!record) {
      setError("Please select a measurement record.");
      setPending(false);
      return;
    }

    const supabase = createClient();
    const { error: insertError } = await supabase.from("jobs").insert({
      measurement_record_id: record.id,
      tailor_id: tailorId,
      garment_type_id: record.garment_type_id,
      due_date: dueDate || null,
      payment_method: paymentMethod,
    });

    if (insertError) {
      setError(insertError.message);
      setPending(false);
      return;
    }

    setPending(false);
    setSuccess(true);
    router.refresh();
  }

  if (loading || !visible) {
    return null;
  }

  if (records.length === 0) {
    return (
      <div className="rounded-md border border-black/[.08] bg-white p-4 text-sm text-zinc-600 dark:border-white/[.145] dark:bg-black dark:text-zinc-400">
        Add a measurement record before requesting a job from this tailor.
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-md border border-black/[.08] bg-white p-4 text-sm text-green-600 dark:border-white/[.145] dark:bg-black">
        Job requested — track it from{" "}
        <a href="/jobs" className="underline">
          My jobs
        </a>
        .
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-md border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-black"
    >
      <h3 className="font-medium text-black dark:text-zinc-50">
        Request a job
      </h3>

      <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
        Measurement record
        <select
          required
          value={recordId}
          onChange={(e) => setRecordId(e.target.value)}
          className="rounded-md border border-black/[.08] bg-white px-3 py-2 text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a record
          </option>
          {records.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label} ({r.garment_types?.name})
            </option>
          ))}
        </select>
      </label>

      {standardPrice !== null && (
        <p className="text-sm text-zinc-500">
          Standard price for this garment: {standardPrice}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
        Due date (optional)
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="rounded-md border border-black/[.08] bg-white px-3 py-2 text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
        />
      </label>

      <fieldset className="flex gap-4 text-sm text-zinc-700 dark:text-zinc-300">
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
        className="h-10 rounded-full bg-foreground px-5 text-sm text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {pending ? "Sending..." : "Send request"}
      </button>
    </form>
  );
}
