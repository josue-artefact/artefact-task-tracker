"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") console.error(error);
  }, [error]);

  return (
    <main className="min-h-[100dvh] bg-cream-50 px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-ink-900/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-ink-500 ring-1 ring-ink-900/5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-rust" />
          Algo se rompió
        </div>
        <h1 className="font-serif italic text-[clamp(40px,6vw,72px)] leading-[0.95] tracking-tightest text-ink-900">
          Un pequeño tropiezo.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[15px] text-ink-600">
          La página tuvo un error inesperado. Puedes intentar de nuevo o volver al inicio.
        </p>
        {process.env.NODE_ENV === "development" && error?.message && (
          <pre className="mx-auto mt-6 max-w-xl overflow-x-auto rounded-2xl bg-ink-900/[0.04] p-4 text-left text-[12px] text-ink-700 ring-1 ring-ink-900/5">
            {error.message}
            {error.digest ? `\n\ndigest: ${error.digest}` : ""}
          </pre>
        )}
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="group flex items-center gap-1 rounded-full bg-ink-900 py-2.5 pl-5 pr-2 text-[12px] font-medium uppercase tracking-[0.18em] text-cream-50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-ink-800 active:scale-[0.98]"
          >
            <span>Intentar de nuevo</span>
            <span className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-cream-50/15 transition-all duration-500 group-hover:translate-x-0.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />
              </svg>
            </span>
          </button>
          <Link
            href="/"
            className="rounded-full bg-cream-100 px-4 py-2.5 text-[12px] font-medium uppercase tracking-[0.18em] text-ink-700 ring-1 ring-ink-900/5 transition hover:bg-ink-900/[0.08]"
          >
            Inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
