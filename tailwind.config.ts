import type { Config } from "tailwindcss";

/**
 * Studio Dark theme (rediseño de productivity).
 *
 * Conservamos los nombres semánticos `cream-*` (background scale) y `ink-*`
 * (foreground scale) por compatibilidad — pero los valores ahora son DARK:
 *   - cream-50 = fondo más oscuro (page background)
 *   - ink-900 = texto más brillante (primary text)
 *
 * La jerarquía visual y el contrato semántico se preservan, solo cambia
 * la luz/oscuridad. Eso permite refactorizar la paleta sin tocar 25+ archivos.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // BACKGROUND SCALE — de más oscuro (50) a más claro (300)
        // Equivale a "elevación" de cards y superficies
        cream: {
          50:  "#0A0A0B",  // page background (casi negro)
          100: "#141417",  // surface — cards, dropdowns
          200: "#1C1C20",  // hover / sub-elevation
          300: "#2A2A2F",  // borders fuertes
        },
        // FOREGROUND SCALE — de más brillante (900) a más opaco (300)
        ink: {
          900: "#FAFAFA",  // primary text
          800: "#E5E5E5",  // high emphasis
          700: "#A1A1A8",  // secondary text
          600: "#71717A",  // tertiary / labels
          500: "#52525B",  // muted / placeholder
          400: "#3F3F46",  // very muted / disabled
          300: "#27272A",  // dividers, hairlines (low-contrast borders)
        },
        // ACCENTS — adaptados al fondo oscuro
        accent: {
          lime: "#A3FF12",  // brand: actions, positive states, active dots
          rust: "#FF7A5C",  // danger: overdue, critical, delete
        },
      },
      fontFamily: {
        // Sans es el default ahora. Serif solo para el logo (inline en ArtefactMark).
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
