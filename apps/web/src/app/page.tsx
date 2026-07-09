import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 font-sans dark:bg-slate-900">
      <main className="flex w-full max-w-md flex-col items-center gap-8 px-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-800 dark:text-slate-50">
          T_Flatform
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Tailor management platform.
        </p>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="flex h-12 flex-1 items-center justify-center rounded-full bg-accent px-5 text-white transition-colors hover:bg-accent-hover"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="flex h-12 flex-1 items-center justify-center rounded-full border border-solid border-slate-200 px-5 transition-colors hover:border-transparent hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Sign up
          </Link>
        </div>
      </main>
    </div>
  );
}
