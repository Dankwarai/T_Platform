"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm`,
    });

    if (error) {
      setError(error.message);
      setPending(false);
      return;
    }

    setPending(false);
    setSent(true);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-6 dark:bg-slate-900">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4"
      >
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-50">
          Reset your password
        </h1>

        {sent ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            If an account exists for {email}, a password reset link has been
            sent. Check your inbox.
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Enter your email and we&apos;ll send you a link to reset your
              password.
            </p>

            <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
              />
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="mt-2 h-11 rounded-full bg-accent px-5 text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {pending ? "Sending..." : "Send reset link"}
            </button>
          </>
        )}

        <p className="text-sm text-slate-600 dark:text-slate-400">
          <Link href="/login" className="font-medium underline">
            Back to log in
          </Link>
        </p>
      </form>
    </div>
  );
}
