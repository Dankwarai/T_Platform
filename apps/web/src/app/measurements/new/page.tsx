"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type GarmentType = { id: string; name: string };
type MeasurementField = {
  id: string;
  field_key: string;
  field_label: string;
  display_order: number;
  guide_instructions: string | null;
};

export default function NewMeasurementRecordPage() {
  const router = useRouter();
  const [garmentTypes, setGarmentTypes] = useState<GarmentType[]>([]);
  const [garmentTypeId, setGarmentTypeId] = useState("");
  const [fields, setFields] = useState<MeasurementField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [label, setLabel] = useState("");
  const [unit, setUnit] = useState<"cm" | "inch">("cm");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("garment_types")
      .select("id, name")
      .order("name")
      .then(({ data }) => setGarmentTypes(data ?? []));
  }, []);

  useEffect(() => {
    if (!garmentTypeId) {
      setFields([]);
      return;
    }
    const supabase = createClient();
    supabase
      .from("measurement_fields")
      .select("id, field_key, field_label, display_order, guide_instructions")
      .eq("garment_type_id", garmentTypeId)
      .order("display_order")
      .then(({ data }) => {
        setFields(data ?? []);
        setValues({});
      });
  }, [garmentTypeId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    const { data: customerProfile } = await supabase
      .from("customer_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!customerProfile) {
      setError("Customer profile not found.");
      setPending(false);
      return;
    }

    const { data: record, error: recordError } = await supabase
      .from("measurement_records")
      .insert({
        customer_id: customerProfile.id,
        garment_type_id: garmentTypeId,
        label,
        unit,
        notes: notes || null,
      })
      .select("id")
      .single();

    if (recordError || !record) {
      setError(recordError?.message ?? "Failed to create record.");
      setPending(false);
      return;
    }

    const valueRows = fields
      .filter((field) => values[field.id])
      .map((field) => ({
        measurement_record_id: record.id,
        measurement_field_id: field.id,
        value: Number(values[field.id]),
      }));

    if (valueRows.length > 0) {
      const { error: valuesError } = await supabase
        .from("measurement_values")
        .insert(valueRows);

      if (valuesError) {
        setError(valuesError.message);
        setPending(false);
        return;
      }
    }

    router.push(`/measurements/${record.id}`);
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-6 py-10 dark:bg-slate-900">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4"
      >
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-50">
          New measurement record
        </h1>

        <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
          Garment type
          <select
            required
            value={garmentTypeId}
            onChange={(e) => setGarmentTypeId(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
          >
            <option value="" disabled>
              Select a garment type
            </option>
            {garmentTypes.map((gt) => (
              <option key={gt.id} value={gt.id}>
                {gt.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
          Label
          <input
            type="text"
            required
            placeholder="e.g. Wedding suit - 2026"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
          Unit
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as "cm" | "inch")}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
          >
            <option value="cm">cm</option>
            <option value="inch">inch</option>
          </select>
        </label>

        {fields.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
            {fields.map((field) => (
              <label
                key={field.id}
                className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300"
              >
                {field.field_label} ({unit})
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  value={values[field.id] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [field.id]: e.target.value,
                    }))
                  }
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
                />
                {field.guide_instructions && (
                  <span className="text-xs text-slate-500">
                    {field.guide_instructions}
                  </span>
                )}
              </label>
            ))}
          </div>
        )}

        <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
          Notes (optional)
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 h-11 rounded-full bg-accent px-5 text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
