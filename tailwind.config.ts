import type { Config } from "tailwindcss";

/**
 * Studio Light — paleta slate + cyan (Linear redesign 2024 vibe).
 *
 * Cool slate neutrals con tinte navy sutil. El primario es cyan-400 (bright
 * cool blue) en lugar del lima neon original — pop pero sin gritar.
 *
 * Convención preservada (mismos nombres semánticos que antes):
 *   - cream-50  = page background (slate-100, navy-tinted)
 *   - cream-100 = card surfaces (pure white — escalón claro vs page)
 *   - cream-200 = hover / sub-elevation (slate-200)
 *   - cream-300 = borders fuertes / pressed state (slate-300)
 *   - ink-900   = primary text (slate-900, navy near-black)
 *   - ink-300   = dividers / hairlines (slate-300)
 *
 * Importante: el key `accent.lime` se conserva por compatibilidad pero su
 * VALOR ahora es cyan-400. El sistema sigue pidiendo texto oscuro sobre el
 * acento, igual que con lima — la pieza estructural no cambia.
 *
 * Mapping a la escala oficial de Tailwind:
 *   cream-50/200/300 = slate-100/200/300
 *   ink-300..900 = slate-300..900
 *   accent.lime = cyan-400, accent.warning = amber-500, accent.rust = orange-400
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // BACKGROUND SCALE — page (50) → borders (300)
        // Los cards (100) son pure white, "elevados" por brillo sobre el slate-100 page.
        cream: {
          50:  "#F1F5F9",  // page background — slate-100 (tinte navy sutil)
          100: "#FFFFFF",  // surface — cards, dropdowns
          200: "#E2E8F0",  // hover / sub-elevation — slate-200
          300: "#CBD5E1",  // borders fuertes / pressed state — slate-300
        },
        // FOREGROUND SCALE — primary (900) → dividers (300)
        // Slate neutrals — navy near-black con character.
        ink: {
          900: "#0F172A",  // primary text — slate-900, navy near-black
          800: "#1E293B",  // high emphasis — slate-800
          700: "#334155",  // secondary text — slate-700
          600: "#475569",  // tertiary / labels — slate-600
          500: "#64748B",  // muted / placeholder — slate-500
          400: "#94A3B8",  // very muted / disabled — slate-400
          300: "#CBD5E1",  // dividers, hairlines — slate-300
        },
        // ACCENTS — brand colors
        // Mantenemos el key `lime` para minimizar refactor; su valor pasa a sky-500.
        accent: {
          lime:    "#0EA5E9",  // brand action — sky-500 (era cyan-400, demasiado celeste)
          warning: "#F59E0B",  // watch this — amber-500
          rust:    "#FB923C",  // danger — orange-400 (mejor en slate que rust antiguo)
        },
        // FIXED — texto/iconos sobre fondos brand. Los 3 accents son brillantes
        // y siempre necesitan contraste oscuro para legibilidad óptima.
        on: {
          accent: "#0F172A",
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
