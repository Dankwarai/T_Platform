"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UserRow = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_suspended: boolean;
  created_at: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("users")
      .select("id, email, full_name, role, is_suspended, created_at")
      .order("created_at", { ascending: false });
    setUsers(data ?? []);
    setLoading(false);
  }

  async function toggleSuspend(userRow: UserRow) {
    setPendingId(userRow.id);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("users")
      .update({ is_suspended: !userRow.is_suspended })
      .eq("id", userRow.id);

    if (updateError) {
      setError(updateError.message);
      setPendingId(null);
      return;
    }

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userRow.id ? { ...u, is_suspended: !u.is_suspended } : u,
      ),
    );
    setPendingId(null);
  }

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      u.full_name.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-50">
        Users
      </h1>
      <input
        type="text"
        placeholder="Search by name or email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-slate-600 dark:text-slate-400">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-600 dark:text-slate-400">No users found.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex flex-col">
                <span className="font-medium text-slate-800 dark:text-slate-50">
                  {u.full_name || "(no name)"}{" "}
                  {u.is_suspended && (
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-400">
                      Suspended
                    </span>
                  )}
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {u.email} · {u.role}
                </span>
              </div>
              <button
                onClick={() => toggleSuspend(u)}
                disabled={pendingId === u.id}
                className="h-9 shrink-0 rounded-full border border-slate-200 px-3 text-sm transition-colors hover:border-transparent hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-700"
              >
                {u.is_suspended ? "Unsuspend" : "Suspend"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
