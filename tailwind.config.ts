import type { Config } from "tailwindcss";

/**
 * Studio Light — paleta zinc moderna (Linear / Vercel / shadcn vibe).
 *
 * Cool neutrals con tinte gris-azulado imperceptible. El "nuevo negro"
 * (#09090B / zinc-950) y "nuevo blanco" (#FAFAFA / zinc-50) en lugar
 * de pure black/white para evitar el look default sin gracia.
 *
 * Convención preservada:
 *   - cream-50  = page background (soft white)
 *   - cream-100 = card surfaces (pure white — "elevado" por brillo)
 *   - cream-200 = hover / sub-elevation
 *   - cream-300 = borders fuertes / pressed state
 *   - ink-900   = primary text (near-black)
 *   - ink-300   = dividers / hairlines
 *
 * El token `on.accent` es FIJO (siempre #09090B), independiente del modo —
 * se usa para texto/iconos sobre fondos brand (lima, warning, rust) que
 * siempre necesitan contraste oscuro para legibilidad.
 *
 * Mapping a la escala oficial de Tailwind zinc:
 *   cream-50 = zinc-50, cream-200 = zinc-100, cream-300 = zinc-200
 *   ink-300 = zinc-300, ..., ink-900 = zinc-950
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // BACKGROUND SCALE — page (50) → borders (300)
        // Los cards (100) son MÁS blancos que el page (50): elevación vía brillo.
        cream: {
          50:  "#FAFAFA",  // page background — zinc-50
          100: "#FFFFFF",  // surface — cards, dropdowns (pure white = "elevado")
          200: "#F4F4F5",  // hover / sub-elevation — zinc-100
          300: "#E4E4E7",  // borders fuertes / pressed state — zinc-200
        },
        // FOREGROUND SCALE — primary (900) → dividers (300)
        // Cool zinc neutrals — sutil tinte gris-azulado, percepción "tech".
        ink: {
          900: "#09090B",  // primary text — zinc-950, "new black"
          800: "#27272A",  // high emphasis — zinc-800
          700: "#3F3F46",  // secondary text — zinc-700
          600: "#52525B",  // tertiary / labels — zinc-600
          500: "#71717A",  // muted / placeholder — zinc-500
          400: "#A1A1AA",  // very muted / disabled — zinc-400
          300: "#D4D4D8",  // dividers, hairlines — zinc-300
        },
        // ACCENTS — brand colors, sin cambios entre modos
        accent: {
          lime:    "#A3FF12",  // brand: actions, positive states, "en tiempo"
          warning: "#D4A82E",  // watch this: pipeline en riesgo, esperando cliente
          rust:    "#FF7A5C",  // danger: overdue, critical, delete
        },
        // FIXED — siempre oscuro, para texto/iconos sobre fondos brand
        // (lima/warning/rust son brillantes y siempre necesitan contraste oscuro)
        on: {
          accent: "#09090B",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"], // solo logo
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "spring-soft": "cubic-bezier(0.32, 0.72, 0, 1)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "quote-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 400ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 300ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "quote-in": "quote-in 500ms cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
