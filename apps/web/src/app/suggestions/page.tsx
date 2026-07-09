"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Suggestion = {
  candidate_user_id: string;
  tailor_id: string;
  business_name: string;
  location: string | null;
  avg_rating: number;
  follower_count: number;
  suggestion_score: number;
};

export default function SuggestionsPage() {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

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

      const { data, error } = await supabase.rpc("get_follow_suggestions", {
        p_user_id: user.id,
        p_limit: 10,
      });

      if (error) {
        console.error(error);
      }
      setSuggestions((data as Suggestion[]) ?? []);
      setLoading(false);
    })();
  }, [router]);

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-6 py-10 dark:bg-slate-900">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-50">
          Suggested tailors
        </h1>

        {loading ? (
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        ) : suggestions.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400">
            No suggestions yet — follow a few tailors or complete a
            measurement record to get personalized picks.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {suggestions.map((s) => (
              <li key={s.candidate_user_id}>
                <Link
                  href={`/tailors/${s.tailor_id}`}
                  className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-800/60"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-800 dark:text-slate-50">
                      {s.business_name}
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {s.location}
                      {s.avg_rating > 0 ? ` · ★ ${s.avg_rating.toFixed(1)}` : ""}
                      {" · "}
                      {s.follower_count} follower
                      {s.follower_count === 1 ? "" : "s"}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
