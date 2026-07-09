"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SkillBadge } from "@/components/SkillBadge";

type GarmentType = { id: string; name: string };
type RankedTailor = {
  id: string;
  business_name: string;
  location: string;
  avg_rating: number;
  rating_count: number;
  follower_count: number;
  skill_tier: string;
};

export default function RankingsPage() {
  const [garmentTypes, setGarmentTypes] = useState<GarmentType[]>([]);
  const [location, setLocation] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");
  const [results, setResults] = useState<RankedTailor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("garment_types")
      .select("id, name")
      .order("name")
      .then(({ data }) => setGarmentTypes(data ?? []));
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const timeout = setTimeout(async () => {
      setLoading(true);

      let query = specialtyId
        ? supabase
            .from("tailor_profiles")
            .select(
              "id, business_name, location, avg_rating, rating_count, follower_count, skill_tier, tailor_specialties!inner(garment_type_id)",
            )
            .eq("tailor_specialties.garment_type_id", specialtyId)
        : supabase
            .from("tailor_profiles")
            .select(
              "id, business_name, location, avg_rating, rating_count, follower_count, skill_tier",
            );

      query = query
        .neq("business_name", "")
        .order("follower_count", { ascending: false });

      if (location) query = query.ilike("location", `%${location}%`);

      const { data } = await query;
      setResults((data as unknown as RankedTailor[]) ?? []);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [location, specialtyId]);

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-6 py-10 dark:bg-slate-900">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-50">
          Top tailors
        </h1>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
          />
          <select
            value={specialtyId}
            onChange={(e) => setSpecialtyId(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
          >
            <option value="">Any specialty</option>
            {garmentTypes.map((gt) => (
              <option key={gt.id} value={gt.id}>
                {gt.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        ) : results.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400">
            No tailors found.
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {results.map((tailor, i) => (
              <li key={tailor.id}>
                <Link
                  href={`/tailors/${tailor.id}`}
                  className="flex items-center gap-4 rounded-md border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-800/60"
                >
                  <span className="w-6 text-lg font-semibold text-slate-400">
                    {i + 1}
                  </span>
                  <div className="flex flex-1 flex-col">
                    <span className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-50">
                      {tailor.business_name}
                      <SkillBadge tier={tailor.skill_tier} />
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {tailor.location}
                      {tailor.rating_count > 0
                        ? ` · ★ ${tailor.avg_rating.toFixed(1)}`
                        : ""}
                    </span>
                  </div>
                  <span className="text-sm text-slate-500">
                    {tailor.follower_count} follower
                    {tailor.follower_count === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
