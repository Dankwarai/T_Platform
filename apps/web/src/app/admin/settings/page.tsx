"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type GarmentType = { id: string; name: string; description: string | null };
type ProductCategory = { id: string; name: string };

export default function AdminSettingsPage() {
  const [commissionRate, setCommissionRate] = useState("");
  const [commissionPending, setCommissionPending] = useState(false);
  const [commissionError, setCommissionError] = useState<string | null>(null);
  const [commissionSaved, setCommissionSaved] = useState(false);

  const [garmentTypes, setGarmentTypes] = useState<GarmentType[]>([]);
  const [newGarmentName, setNewGarmentName] = useState("");
  const [newGarmentDescription, setNewGarmentDescription] = useState("");
  const [garmentError, setGarmentError] = useState<string | null>(null);

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const supabase = createClient();
    const [{ data: settings }, { data: gt }, { data: cats }] =
      await Promise.all([
        supabase
          .from("platform_settings")
          .select("commission_rate")
          .eq("id", true)
          .single(),
        supabase
          .from("garment_types")
          .select("id, name, description")
          .order("name"),
        supabase.from("product_categories").select("id, name").order("name"),
      ]);
    if (settings) {
      setCommissionRate((settings.commission_rate * 100).toString());
    }
    setGarmentTypes(gt ?? []);
    setCategories(cats ?? []);
    setLoading(false);
  }

  async function saveCommissionRate() {
    setCommissionPending(true);
    setCommissionError(null);
    setCommissionSaved(false);

    const rateFraction = Number(commissionRate) / 100;
    if (Number.isNaN(rateFraction) || rateFraction < 0 || rateFraction > 1) {
      setCommissionError("Enter a percentage between 0 and 100.");
      setCommissionPending(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("platform_settings")
      .update({ commission_rate: rateFraction })
      .eq("id", true);

    if (error) {
      setCommissionError(error.message);
      setCommissionPending(false);
      return;
    }

    setCommissionPending(false);
    setCommissionSaved(true);
  }

  async function addGarmentType() {
    setGarmentError(null);
    if (!newGarmentName.trim()) return;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("garment_types")
      .insert({
        name: newGarmentName.trim(),
        description: newGarmentDescription.trim() || null,
      })
      .select("id, name, description")
      .single();

    if (error || !data) {
      setGarmentError(error?.message ?? "Failed to add garment type.");
      return;
    }

    setGarmentTypes((prev) =>
      [...prev, data].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setNewGarmentName("");
    setNewGarmentDescription("");
  }

  async function deleteGarmentType(id: string) {
    setGarmentError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("garment_types")
      .delete()
      .eq("id", id);
    if (error) {
      // In-use garment types (referenced by measurement_records, jobs,
      // tailor_specialties, etc.) are protected by FK constraints — this
      // surfaces that DB error directly rather than a generic message.
      setGarmentError(error.message);
      return;
    }
    setGarmentTypes((prev) => prev.filter((gt) => gt.id !== id));
  }

  async function addCategory() {
    setCategoryError(null);
    if (!newCategoryName.trim()) return;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("product_categories")
      .insert({ name: newCategoryName.trim() })
      .select("id, name")
      .single();

    if (error || !data) {
      setCategoryError(error?.message ?? "Failed to add category.");
      return;
    }

    setCategories((prev) =>
      [...prev, data].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setNewCategoryName("");
  }

  async function deleteCategory(id: string) {
    setCategoryError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("product_categories")
      .delete()
      .eq("id", id);
    if (error) {
      setCategoryError(error.message);
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  if (loading) {
    return <p className="text-slate-600 dark:text-slate-400">Loading...</p>;
  }

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-50">
        Settings
      </h1>

      <section className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-lg font-medium text-slate-800 dark:text-slate-50">
          Marketplace commission
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Applies to new orders only — orders already placed keep the rate
          that was in effect when they were created.
        </p>
        <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
          Commission rate (%)
          <input
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={commissionRate}
            onChange={(e) => setCommissionRate(e.target.value)}
            className="w-32 rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
          />
        </label>
        {commissionError && (
          <p className="text-sm text-red-600">{commissionError}</p>
        )}
        {commissionSaved && (
          <p className="text-sm text-green-600">Saved.</p>
        )}
        <button
          onClick={saveCommissionRate}
          disabled={commissionPending}
          className="h-10 w-fit rounded-full bg-accent px-4 text-sm text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {commissionPending ? "Saving..." : "Save"}
        </button>
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-lg font-medium text-slate-800 dark:text-slate-50">
          Garment types
        </h2>
        {garmentError && <p className="text-sm text-red-600">{garmentError}</p>}
        <ul className="flex flex-col gap-2">
          {garmentTypes.map((gt) => (
            <li
              key={gt.id}
              className="flex items-center justify-between gap-3"
            >
              <span className="text-sm text-slate-800 dark:text-slate-50">
                {gt.name}
                {gt.description && (
                  <span className="text-slate-500"> — {gt.description}</span>
                )}
              </span>
              <button
                onClick={() => deleteGarmentType(gt.id)}
                className="shrink-0 text-sm text-red-600 hover:underline"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            placeholder="Name"
            value={newGarmentName}
            onChange={(e) => setNewGarmentName(e.target.value)}
            className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newGarmentDescription}
            onChange={(e) => setNewGarmentDescription(e.target.value)}
            className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
          />
          <button
            onClick={addGarmentType}
            className="h-10 shrink-0 rounded-full bg-accent px-4 text-sm text-white transition-colors hover:bg-accent-hover"
          >
            Add
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-lg font-medium text-slate-800 dark:text-slate-50">
          Product categories
        </h2>
        {categoryError && (
          <p className="text-sm text-red-600">{categoryError}</p>
        )}
        <ul className="flex flex-col gap-2">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-800 dark:text-slate-50">
                {c.name}
              </span>
              <button
                onClick={() => deleteCategory(c.id)}
                className="shrink-0 text-sm text-red-600 hover:underline"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
          />
          <button
            onClick={addCategory}
            className="h-10 shrink-0 rounded-full bg-accent px-4 text-sm text-white transition-colors hover:bg-accent-hover"
          >
            Add
          </button>
        </div>
      </section>
    </>
  );
}
