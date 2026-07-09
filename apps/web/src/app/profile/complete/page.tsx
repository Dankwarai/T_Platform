"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type GarmentType = { id: string; name: string };

export default function CompleteTailorProfilePage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [garmentTypes, setGarmentTypes] = useState<GarmentType[]>([]);
  const [specialtyIds, setSpecialtyIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data } = await supabase
        .from("tailor_profiles")
        .select("id, business_name, location, bio, years_experience")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setBusinessName(data.business_name ?? "");
        setLocation(data.location ?? "");
        setBio(data.bio ?? "");
        setYearsExperience(data.years_experience?.toString() ?? "");

        const { data: existingSpecialties } = await supabase
          .from("tailor_specialties")
          .select("garment_type_id")
          .eq("tailor_id", data.id);
        setSpecialtyIds(
          new Set((existingSpecialties ?? []).map((s) => s.garment_type_id)),
        );
      }

      const { data: allGarmentTypes } = await supabase
        .from("garment_types")
        .select("id, name")
        .order("name");
      setGarmentTypes(allGarmentTypes ?? []);

      setLoading(false);
    });
  }, [router]);

  function toggleSpecialty(id: string) {
    setSpecialtyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

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

    const { data: tailorProfile, error } = await supabase
      .from("tailor_profiles")
      .update({
        business_name: businessName,
        location,
        bio: bio || null,
        years_experience: yearsExperience ? Number(yearsExperience) : null,
      })
      .eq("user_id", user.id)
      .select("id")
      .single();

    if (error || !tailorProfile) {
      setError(error?.message ?? "Failed to save profile.");
      setPending(false);
      return;
    }

    // Sync specialties: delete-then-insert is simplest and avoids diffing.
    await supabase
      .from("tailor_specialties")
      .delete()
      .eq("tailor_id", tailorProfile.id);

    if (specialtyIds.size > 0) {
      const { error: specialtiesError } = await supabase
        .from("tailor_specialties")
        .insert(
          Array.from(specialtyIds).map((garmentTypeId) => ({
            tailor_id: tailorProfile.id,
            garment_type_id: garmentTypeId,
          })),
        );

      if (specialtiesError) {
        setError(specialtiesError.message);
        setPending(false);
        return;
      }
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
        <p className="text-slate-600 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-6 dark:bg-slate-900">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4"
      >
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-50">
          Complete your tailor profile
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Customers will see this on your public profile.
        </p>

        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          Business name
          <input
            type="text"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
          Location
          <input
            type="text"
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
          Bio (optional)
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
          Years of experience (optional)
          <input
            type="number"
            min={0}
            value={yearsExperience}
            onChange={(e) => setYearsExperience(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
          />
        </label>

        <div className="flex flex-col gap-2 text-sm text-slate-700 dark:text-slate-300">
          Specialties
          <div className="flex flex-wrap gap-2">
            {garmentTypes.map((gt) => (
              <label
                key={gt.id}
                className={
                  specialtyIds.has(gt.id)
                    ? "flex items-center gap-2 rounded-full border border-accent bg-indigo-50 px-3 py-1 dark:bg-indigo-950"
                    : "flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 dark:border-slate-700"
                }
              >
                <input
                  type="checkbox"
                  checked={specialtyIds.has(gt.id)}
                  onChange={() => toggleSpecialty(gt.id)}
                  className="sr-only"
                />
                {gt.name}
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 h-11 rounded-full bg-accent px-5 text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save and continue"}
        </button>
      </form>
    </div>
  );
}
