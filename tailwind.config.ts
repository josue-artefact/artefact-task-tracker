import type { Config } from "tailwindcss";

/**
 * Studio Warm Light — paleta editorial cálida.
 *
 * Conservamos los nombres semánticos `cream-*` (background scale) y `ink-*`
 * (foreground scale) — el patrón es el mismo que en dark, pero los valores
 * son ahora claros y cálidos.
 *
 * Convención preservada:
 *   - cream-50  = page background (más cálido/contextual)
 *   - cream-100 = card surfaces (más blanco — "elevado" por brillo)
 *   - cream-200 = hover / sub-elevation
 *   - cream-300 = borders fuertes / pressed state
 *   - ink-900   = primary text (más oscuro)
 *   - ink-300   = dividers / hairlines (más claro)
 *
 * El token `on.accent` es FIJO (siempre #0A0A0B), independiente del modo —
 * se usa para texto/iconos sobre fondos brand (lima, warning, rust) que
 * siempre necesitan contraste oscuro para legibilidad.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // BACKGROUND SCALE — de menos brillante (50, page) a más cargado (300, borders)
        // Los cards (100) son MÁS blancos que el page (50): elevación vía brillo.
        cream: {
          50:  "#F2EDE0",  // page background — warm cream editorial
          100: "#FFFFFF",  // surface — cards, dropdowns (pure white = "elevado")
          200: "#FAF6EB",  // hover / sub-elevation (entre cream-50 y white)
          300: "#E5DECC",  // borders fuertes / pressed state
        },
        // FOREGROUND SCALE — de más oscuro (900) a más claro (300)
        // Ligero tinte cálido para coherencia con el page cream.
        ink: {
          900: "#1A1814",  // primary text — warm near-black
          800: "#2E2A22",  // high emphasis
          700: "#56503F",  // secondary text
          600: "#7A715D",  // tertiary / labels
          500: "#9C9484",  // muted / placeholder
          400: "#BFB8A7",  // very muted / disabled
          300: "#DCD5C2",  // dividers, hairlines (low-contrast borders)
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
          accent: "#0A0A0B",
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
