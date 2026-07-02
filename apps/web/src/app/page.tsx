import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-md flex-col items-center gap-8 px-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          T_Flatform
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Tailor management platform.
        </p>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="flex h-12 flex-1 items-center justify-center rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="flex h-12 flex-1 items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            Sign up
          </Link>
        </div>
      </main>
    </div>
  );
}
