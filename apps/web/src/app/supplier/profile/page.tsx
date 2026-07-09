"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AvatarUpload } from "@/components/AvatarUpload";

export default function SupplierProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [supplierProfileId, setSupplierProfileId] = useState<string | null>(
    null,
  );
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
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
      setUserId(user.id);

      const { data } = await supabase
        .from("supplier_profiles")
        .select("id, business_name, location, bio, avatar_path")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setSupplierProfileId(data.id);
        setAvatarPath(data.avatar_path ?? null);
        setBusinessName(data.business_name ?? "");
        setLocation(data.location ?? "");
        setBio(data.bio ?? "");
      }

      setLoading(false);
    });
  }, [router]);

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

    const { error } = await supabase
      .from("supplier_profiles")
      .update({
        business_name: businessName,
        location,
        bio: bio || null,
      })
      .eq("user_id", user.id);

    if (error) {
      setError(error.message);
      setPending(false);
      return;
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
          Complete your supplier profile
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Tailors and customers will see this on your public profile.
        </p>

        {userId && supplierProfileId && (
          <AvatarUpload
            table="supplier_profiles"
            profileId={supplierProfileId}
            userId={userId}
            avatarPath={avatarPath}
            onChange={setAvatarPath}
          />
        )}

        <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
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
