"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type MeasurementField = {
  id: string;
  field_key: string;
  field_label: string;
  display_order: number;
  guide_instructions: string | null;
};

export default function MeasurementRecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [label, setLabel] = useState("");
  const [unit, setUnit] = useState<"cm" | "inch">("cm");
  const [notes, setNotes] = useState("");
  const [garmentTypeName, setGarmentTypeName] = useState("");
  const [fields, setFields] = useState<MeasurementField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const { data: record } = await supabase
        .from("measurement_records")
        .select("label, unit, notes, garment_type_id, garment_types(name)")
        .eq("id", id)
        .single();

      if (!record) {
        setLoading(false);
        return;
      }

      setLabel(record.label);
      setUnit(record.unit);
      setNotes(record.notes ?? "");
      setGarmentTypeName(
        (record.garment_types as unknown as { name: string } | null)?.name ??
          "",
      );

      const { data: fieldsData } = await supabase
        .from("measurement_fields")
        .select("id, field_key, field_label, display_order, guide_instructions")
        .eq("garment_type_id", record.garment_type_id)
        .order("display_order");

      setFields(fieldsData ?? []);

      const { data: valuesData } = await supabase
        .from("measurement_values")
        .select("measurement_field_id, value")
        .eq("measurement_record_id", id);

      const valueMap: Record<string, string> = {};
      for (const v of valuesData ?? []) {
        valueMap[v.measurement_field_id] = v.value.toString();
      }
      setValues(valueMap);
      setLoading(false);
    })();
  }, [id]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("measurement_records")
      .update({ label, unit, notes: notes || null })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setPending(false);
      return;
    }

    const valueRows = fields
      .filter((field) => values[field.id])
      .map((field) => ({
        measurement_record_id: id,
        measurement_field_id: field.id,
        value: Number(values[field.id]),
      }));

    if (valueRows.length > 0) {
      const { error: valuesError } = await supabase
        .from("measurement_values")
        .upsert(valueRows, {
          onConflict: "measurement_record_id,measurement_field_id",
        });

      if (valuesError) {
        setError(valuesError.message);
        setPending(false);
        return;
      }
    }

    setPending(false);
    router.push("/measurements");
  }

  async function handleDelete() {
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("measurement_records")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.push("/measurements");
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
        <p className="text-slate-600 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-6 py-10 dark:bg-slate-900">
      <form
        onSubmit={handleSave}
        className="flex w-full max-w-sm flex-col gap-4"
      >
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-50">
          {garmentTypeName}
        </h1>

        <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
          Label
          <input
            type="text"
            required
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

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={pending}
            className="h-11 flex-1 rounded-full bg-accent px-5 text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? "Saving..." : "Save changes"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-11 rounded-full border border-solid border-red-600 px-5 text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950"
          >
            Delete
          </button>
        </div>
      </form>
    </div>
  );
}
