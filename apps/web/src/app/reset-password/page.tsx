"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// Reached via the email link from /forgot-password, by way of /auth/confirm
// — which verifies the recovery token_hash server-side and sets the session
// cookie before redirecting here. So by the time this page mounts, the
// browser client just needs to pick up that already-set cookie; no
// URL-fragment parsing needed here (see /auth/confirm for why: a
// PKCE-configured client can't consume GoTrue's default hash-fragment
// redirect at all).
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">(
    "checking",
  );

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setStatus(data.user ? "ready" : "invalid");
    });
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setPending(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (status === "checking") {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
        <p className="text-slate-600 dark:text-slate-400">
          Verifying reset link...
        </p>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center dark:bg-slate-900">
        <p className="text-slate-600 dark:text-slate-400">
          This reset link is invalid or has expired.
        </p>
        <Link
          href="/forgot-password"
          className="font-medium text-accent underline"
        >
          Request a new link
        </Link>
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
          Set a new password
        </h1>

        <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
          New password
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 h-11 rounded-full bg-accent px-5 text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save new password"}
        </button>
      </form>
    </div>
  );
}
