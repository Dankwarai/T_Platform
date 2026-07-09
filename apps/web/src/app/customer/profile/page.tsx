"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CustomerProfilePage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [preferredUnit, setPreferredUnit] = useState<"cm" | "inch">("cm");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: userRow } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", user.id)
        .single();
      setFullName(userRow?.full_name ?? "");

      const { data: customerProfile } = await supabase
        .from("customer_profiles")
        .select("location, bio, preferred_unit")
        .eq("user_id", user.id)
        .single();

      if (customerProfile) {
        setLocation(customerProfile.location ?? "");
        setBio(customerProfile.bio ?? "");
        setPreferredUnit(customerProfile.preferred_unit);
      }

      setLoading(false);
    });
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { error: userError } = await supabase
      .from("users")
      .update({ full_name: fullName })
      .eq("id", user.id);

    if (userError) {
      setError(userError.message);
      setPending(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("customer_profiles")
      .update({
        location: location || null,
        bio: bio || null,
        preferred_unit: preferredUnit,
      })
      .eq("user_id", user.id);

    if (profileError) {
      setError(profileError.message);
      setPending(false);
      return;
    }

    setPending(false);
    setSaved(true);
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
          My profile
        </h1>

        <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
          Full name
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
          Location (optional)
          <input
            type="text"
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

        <fieldset className="flex gap-4 text-sm text-slate-700 dark:text-slate-300">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={preferredUnit === "cm"}
              onChange={() => setPreferredUnit("cm")}
            />
            Centimeters
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={preferredUnit === "inch"}
              onChange={() => setPreferredUnit("inch")}
            />
            Inches
          </label>
        </fieldset>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-green-600">Saved.</p>}

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
