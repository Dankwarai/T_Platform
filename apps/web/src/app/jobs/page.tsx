"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type JobRow = {
  id: string;
  status: string;
  due_date: string | null;
  created_at: string;
  garment_types: { name: string } | null;
  tailor_profiles: { business_name: string } | null;
  measurement_records: {
    label: string;
    customer_profiles: { users: { full_name: string } | null } | null;
  } | null;
};

const STATUS_LABELS: Record<string, string> = {
  requested: "Requested",
  accepted: "Accepted",
  rejected: "Rejected",
  in_progress: "In progress",
  ready_for_fitting: "Ready for fitting",
  adjusting: "Adjusting",
  completed: "Completed",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function JobsListPage() {
  const [role, setRole] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      setRole(profile?.role ?? null);

      // RLS already scopes this to jobs the user participates in, either
      // as the customer (via measurement_records) or the assigned tailor.
      const { data } = await supabase
        .from("jobs")
        .select(
          "id, status, due_date, created_at, garment_types(name), tailor_profiles(business_name), measurement_records(label, customer_profiles(users(full_name)))",
        )
        .order("created_at", { ascending: false });

      setJobs((data as unknown as JobRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-10 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          My jobs
        </h1>

        {loading ? (
          <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
        ) : jobs.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">No jobs yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {jobs.map((job) => {
              const counterpart =
                role === "tailor"
                  ? job.measurement_records?.customer_profiles?.users
                      ?.full_name
                  : job.tailor_profiles?.business_name;

              return (
                <li key={job.id}>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="flex items-center justify-between rounded-md border border-black/[.08] bg-white p-4 transition-colors hover:bg-black/[.02] dark:border-white/[.145] dark:bg-black dark:hover:bg-white/[.03]"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-black dark:text-zinc-50">
                        {job.measurement_records?.label} ·{" "}
                        {job.garment_types?.name}
                      </span>
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {counterpart ?? "Unknown"}
                        {job.due_date ? ` · due ${job.due_date}` : ""}
                      </span>
                    </div>
                    <span className="text-sm text-zinc-500">
                      {STATUS_LABELS[job.status] ?? job.status}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
