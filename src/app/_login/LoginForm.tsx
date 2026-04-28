"use client";

import { useState } from "react";
import { loginAction } from "../actions/auth";

export function LoginForm({ errorMessage }: { errorMessage: string | null }) {
  const [value, setValue] = useState("");

  return (
    <form action={loginAction} className="group relative">
      {/* Outer shell — Doppelrand */}
      <div
        className={[
          "rounded-full p-1.5 ring-1 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "bg-ink-900/[0.04] ring-ink-900/10",
          "focus-within:bg-ink-900/[0.06] focus-within:ring-ink-900/30",
          "hover:bg-ink-900/[0.06]",
        ].join(" ")}
      >
        {/* Inner core */}
        <div className="flex items-center rounded-full bg-cream-50 px-5 py-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_1px_0_rgba(10,9,7,0.04)]">
          <span
            className={[
              "select-none font-serif italic transition-all duration-500 ease-out",
              value ? "text-ink-900" : "text-ink-400",
              "text-[28px] leading-none mr-1",
            ].join(" ")}
          >
            @
          </span>
          <input
            name="handle"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/^@/, ""))}
            className="flex-1 bg-transparent font-serif italic text-[26px] leading-none text-ink-900 placeholder:text-ink-300/80 focus:outline-none"
            aria-label="Handle"
          />
          <button
            type="submit"
            disabled={!value}
            aria-label="Entrar"
            className={[
              "ml-2 flex h-11 w-11 items-center justify-center rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
              "bg-ink-900 text-cream-50",
              "hover:scale-105 active:scale-[0.96]",
              "disabled:bg-ink-900/15 disabled:text-ink-400 disabled:hover:scale-100",
            ].join(" ")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-3 h-4 text-center">
        {errorMessage ? (
          <p className="animate-fade-in text-[12px] uppercase tracking-[0.18em] text-accent-rust">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </form>
  );
}
