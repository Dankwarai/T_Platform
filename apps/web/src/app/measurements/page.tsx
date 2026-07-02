"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type MeasurementRecordRow = {
  id: string;
  label: string;
  unit: string;
  created_at: string;
  garment_types: { name: string } | null;
};

export default function MeasurementsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<MeasurementRecordRow[]>([]);
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

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "customer") {
        router.replace("/dashboard");
        return;
      }

      const { data: customerProfile } = await supabase
        .from("customer_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!customerProfile) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("measurement_records")
        .select("id, label, unit, created_at, garment_types(name)")
        .eq("customer_id", customerProfile.id)
        .order("created_at", { ascending: false });

      setRecords((data as unknown as MeasurementRecordRow[]) ?? []);
      setLoading(false);
    })();
  }, [router]);

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-10 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            My measurements
          </h1>
          <Link
            href="/measurements/new"
            className="h-10 rounded-full bg-foreground px-4 leading-[40px] text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            + New
          </Link>
        </div>

        {loading ? (
          <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
        ) : records.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">
            No measurement records yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {records.map((record) => (
              <li key={record.id}>
                <Link
                  href={`/measurements/${record.id}`}
                  className="flex items-center justify-between rounded-md border border-black/[.08] bg-white p-4 transition-colors hover:bg-black/[.02] dark:border-white/[.145] dark:bg-black dark:hover:bg-white/[.03]"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-black dark:text-zinc-50">
                      {record.label}
                    </span>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {record.garment_types?.name} ·{" "}
                      {new Date(record.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="text-sm text-zinc-500">
                    {record.unit}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
