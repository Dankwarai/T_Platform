"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type SupplierResult = {
  id: string;
  business_name: string;
  bio: string | null;
  location: string;
  follower_count: number;
};

export default function SuppliersPage() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [results, setResults] = useState<SupplierResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const timeout = setTimeout(async () => {
      setLoading(true);

      let query = supabase
        .from("supplier_profiles")
        .select("id, business_name, bio, location, follower_count")
        .neq("business_name", "")
        .order("follower_count", { ascending: false });

      if (name) query = query.ilike("business_name", `%${name}%`);
      if (location) query = query.ilike("location", `%${location}%`);

      const { data } = await query;
      setResults(data ?? []);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [name, location]);

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-10 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Find a supplier
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
        </div>

        {loading ? (
          <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
        ) : results.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">
            No suppliers found.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {results.map((supplier) => (
              <li key={supplier.id}>
                <Link
                  href={`/suppliers/${supplier.id}`}
                  className="flex flex-col gap-1 rounded-md border border-black/[.08] bg-white p-4 transition-colors hover:bg-black/[.02] dark:border-white/[.145] dark:bg-black dark:hover:bg-white/[.03]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-black dark:text-zinc-50">
                      {supplier.business_name}
                    </span>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {supplier.follower_count} follower
                      {supplier.follower_count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {supplier.location}
                  </span>
                  {supplier.bio && (
                    <span className="text-sm text-zinc-500 dark:text-zinc-500">
                      {supplier.bio}
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
