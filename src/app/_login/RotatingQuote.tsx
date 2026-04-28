"use client";

import { useEffect, useState } from "react";
import type { Quote } from "@/lib/quotes";

export function RotatingQuote({ initial }: { initial: Quote }) {
  const [quote, setQuote] = useState<Quote>(initial);
  const [key, setKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/quote", { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as Quote;
        if (cancelled) return;
        setQuote(next);
        setKey((k) => k + 1);
      } catch {
        // silent — keep showing previous
      }
    }, 9000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <figure key={key} className="animate-quote-in mx-auto max-w-2xl text-center">
      <blockquote className="font-serif italic text-ink-900 text-balance text-[clamp(28px,4vw,44px)] leading-[1.1] tracking-tightest">
        &ldquo;{quote.q}&rdquo;
      </blockquote>
      <figcaption className="mt-5 text-[11px] uppercase tracking-[0.22em] text-ink-500">
        — {quote.a}
      </figcaption>
    </figure>
  );
}
