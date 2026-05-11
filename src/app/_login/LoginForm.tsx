"use client";

import { useState } from "react";
import { loginAction } from "../actions/auth";

export function LoginForm({ errorMessage }: { errorMessage: string | null }) {
  const [value, setValue] = useState("");

  return (
    <form action={loginAction} className="group relative">
      {/* Pill de entrada — el login conserva un toque editorial (única excepción a la app productiva) */}
      <div
        className={[
          "flex items-center rounded-full px-5 py-3 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "bg-cream-100 ring-1 ring-ink-300/30",
          "focus-within:ring-accent-lime/40 focus-within:bg-cream-200/60",
        ].join(" ")}
      >
        <span
          className={[
            "select-none font-serif italic transition-all duration-500 ease-out",
            value ? "text-ink-900" : "text-ink-500",
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
          className="flex-1 bg-transparent font-serif italic text-[26px] leading-none text-ink-900 placeholder:text-ink-500/60 focus:outline-none"
          aria-label="Handle"
        />
        <button
          type="submit"
          disabled={!value}
          aria-label="Entrar"
          className={[
            "ml-2 flex h-11 w-11 items-center justify-center rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
            "bg-accent-lime text-on-accent",
            "hover:scale-105 active:scale-[0.96]",
            "disabled:bg-cream-200 disabled:text-ink-500 disabled:hover:scale-100",
          ].join(" ")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
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
