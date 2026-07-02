"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type TailorResult = {
  id: string;
  business_name: string;
  bio: string | null;
  location: string;
  years_experience: number | null;
  avg_rating: number;
  rating_count: number;
};

export default function TailorsPage() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [results, setResults] = useState<TailorResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const timeout = setTimeout(async () => {
      setLoading(true);

      let query = supabase
        .from("tailor_profiles")
        .select(
          "id, business_name, bio, location, years_experience, avg_rating, rating_count",
        )
        .neq("business_name", "")
        .order("avg_rating", { ascending: false });

      if (name) query = query.ilike("business_name", `%${name}%`);
      if (location) query = query.ilike("location", `%${location}%`);
      if (minRating > 0) query = query.gte("avg_rating", minRating);

      const { data } = await query;
      setResults(data ?? []);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [name, location, minRating]);

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-10 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Find a tailor
        </h1>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Search by name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-md border border-black/[.08] bg-white px-3 py-2 text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
          />
          <input
            type="text"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="flex-1 rounded-md border border-black/[.08] bg-white px-3 py-2 text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
          />
          <select
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            className="rounded-md border border-black/[.08] bg-white px-3 py-2 text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
          >
            <option value={0}>Any rating</option>
            <option value={3}>3+ stars</option>
            <option value={4}>4+ stars</option>
            <option value={4.5}>4.5+ stars</option>
          </select>
        </div>

        {loading ? (
          <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
        ) : results.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">
            No tailors found.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {results.map((tailor) => (
              <li key={tailor.id}>
                <Link
                  href={`/tailors/${tailor.id}`}
                  className="flex flex-col gap-1 rounded-md border border-black/[.08] bg-white p-4 transition-colors hover:bg-black/[.02] dark:border-white/[.145] dark:bg-black dark:hover:bg-white/[.03]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-black dark:text-zinc-50">
                      {tailor.business_name}
                    </span>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {tailor.rating_count > 0
                        ? `★ ${tailor.avg_rating.toFixed(1)} (${tailor.rating_count})`
                        : "No reviews yet"}
                    </span>
                  </div>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {tailor.location}
                    {tailor.years_experience
                      ? ` · ${tailor.years_experience} yrs experience`
                      : ""}
                  </span>
                  {tailor.bio && (
                    <span className="text-sm text-zinc-500 dark:text-zinc-500">
                      {tailor.bio}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
