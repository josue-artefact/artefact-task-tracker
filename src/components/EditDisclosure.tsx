"use client";

import { createContext, useContext, useState } from "react";

/**
 * Disclosure de "editar" — patrón con context.
 *
 * <EditCard> es el contenedor controlador. Adentro:
 *   - <EditTrigger /> renderiza el botón (típicamente al lado de "Borrar").
 *   - <EditPanel>...</EditPanel> renderiza el contenido cuando está abierto,
 *     en una sección aparte del DOM (ancho completo de la card).
 *
 * Esto permite que el trigger viva en un cluster estrecho y el form se
 * expanda en su propio renglón sin pelearse con el flex parent.
 */

type Ctx = { open: boolean; toggle: () => void };

const EditContext = createContext<Ctx | null>(null);

export function EditCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <EditContext.Provider value={{ open, toggle: () => setOpen((o) => !o) }}>
      {className ? <div className={className}>{children}</div> : <>{children}</>}
    </EditContext.Provider>
  );
}

export function EditTrigger({ label = "Editar" }: { label?: string }) {
  const ctx = useContext(EditContext);
  if (!ctx) return null;
  return (
    <button
      type="button"
      onClick={ctx.toggle}
      aria-expanded={ctx.open}
      className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-ink-900/[0.04] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-700 ring-1 ring-ink-900/5 transition hover:bg-ink-900/[0.08]"
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`transition-transform duration-300 ${ctx.open ? "rotate-90" : ""}`}
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
      <span>{label}</span>
    </button>
  );
}

export function EditPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = useContext(EditContext);
  if (!ctx?.open) return null;
  return (
    <div className={`animate-fade-up ${className}`}>
      {children}
    </div>
  );
}

/**
 * Compat shim — el EditDisclosure original (un solo elemento). Lo dejamos para
 * casos donde el form sí cabe inline (Card del detalle de tarea) y para no
 * romper imports viejos.
 */
export function EditDisclosure({
  label = "Editar",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <EditCard>
      <EditTrigger label={label} />
      <EditPanel className="mt-3">{children}</EditPanel>
    </EditCard>
  );
}
