"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type GarmentType = { id: string; name: string };

export default function TailorServicePricesPage() {
  const router = useRouter();
  const [tailorId, setTailorId] = useState<string | null>(null);
  const [garmentTypes, setGarmentTypes] = useState<GarmentType[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "tailor") {
        router.replace("/dashboard");
        return;
      }

      const { data: tailorProfile } = await supabase
        .from("tailor_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!tailorProfile) {
        setLoading(false);
        return;
      }
      setTailorId(tailorProfile.id);

      const { data: allGarmentTypes } = await supabase
        .from("garment_types")
        .select("id, name")
        .order("name");
      setGarmentTypes(allGarmentTypes ?? []);

      const { data: existingPrices } = await supabase
        .from("tailor_service_prices")
        .select("garment_type_id, price")
        .eq("tailor_id", tailorProfile.id);

      const priceMap: Record<string, string> = {};
      for (const p of existingPrices ?? []) {
        priceMap[p.garment_type_id] = p.price.toString();
      }
      setPrices(priceMap);
      setLoading(false);
    })();
  }, [router]);

  async function handleSave() {
    if (!tailorId) return;
    setPending(true);
    setError(null);
    setSaved(false);

    const supabase = createClient();

    // Delete-then-insert is simplest and avoids diffing rows to upsert.
    await supabase.from("tailor_service_prices").delete().eq("tailor_id", tailorId);

    const rows = Object.entries(prices)
      .filter(([, value]) => value.trim() !== "")
      .map(([garmentTypeId, value]) => ({
        tailor_id: tailorId,
        garment_type_id: garmentTypeId,
        price: Number(value),
      }));

    if (rows.length > 0) {
      const { error: insertError } = await supabase
        .from("tailor_service_prices")
        .insert(rows);

      if (insertError) {
        setError(insertError.message);
        setPending(false);
        return;
      }
    }

    setPending(false);
    setSaved(true);
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-10 dark:bg-black">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Standard prices
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Set a standard rate per garment type. Customers see this before
          requesting a job; you can still quote a custom price when
          accepting.
        </p>

        {garmentTypes.map((gt) => (
          <label
            key={gt.id}
            className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300"
          >
            {gt.name}
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="No standard price set"
              value={prices[gt.id] ?? ""}
              onChange={(e) =>
                setPrices((prev) => ({ ...prev, [gt.id]: e.target.value }))
              }
              className="rounded-md border border-black/[.08] bg-white px-3 py-2 text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
            />
          </label>
        ))}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-green-600">Saved.</p>}

        <button
          onClick={handleSave}
          disabled={pending}
          className="mt-2 h-11 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {pending ? "Saving..." : "Save prices"}
        </button>
      </div>
    </div>
  );
}
