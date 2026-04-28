"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  initial: string;
  sortKey: string;
  sortDir: string;
};

/**
 * Client-side search input. Updates the URL with `router.replace({ scroll: false })`
 * after a short debounce, so the page swaps the table data without scrolling away.
 */
export function AdminSearchInput({ initial, sortKey, sortDir }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const isFirstRun = useRef(true);

  // Sync state when the URL changes externally (e.g., user clicks a sort header).
  useEffect(() => {
    setValue(initial);
  }, [initial]);

  useEffect(() => {
    // Skip the very first effect run — avoids a redundant replace on mount.
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    const t = setTimeout(() => {
      const sp = new URLSearchParams();
      if (value) sp.set("q", value);
      if (sortKey && sortKey !== "updated") sp.set("sort", sortKey);
      if (sortDir && sortDir !== "desc") sp.set("dir", sortDir);
      const qs = sp.toString();
      router.replace(qs ? `/admin?${qs}` : "/admin", { scroll: false });
    }, 220);
    return () => clearTimeout(t);
  }, [value, sortKey, sortDir, router]);

  return (
    <div className="mb-4 flex items-center gap-2">
      <div className="flex flex-1 items-center gap-2 rounded-full bg-ink-900/[0.04] px-4 py-2 ring-1 ring-ink-900/5 focus-within:bg-ink-900/[0.06] focus-within:ring-ink-900/20">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-ink-500">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Buscar por título, proyecto, cliente o @handle…"
          className="flex-1 bg-transparent text-[13px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
          aria-label="Buscar tareas"
        />
      </div>
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          className="rounded-full bg-ink-900/[0.04] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-500 ring-1 ring-ink-900/5 transition hover:bg-ink-900 hover:text-cream-50"
        >
          Limpiar
        </button>
      )}
    </div>
  );
}
