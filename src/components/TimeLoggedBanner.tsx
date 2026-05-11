"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDuration } from "@/lib/time";

type Props = {
  minutes: number;
  /** Si vienes de un switch, el ID de la tarea anterior (sólo se usa para wording). */
  fromTaskId?: string | null;
  /** ID de la tarea actual (la que está visible) para reconstruir la URL al limpiar. */
  taskId: string;
};

/**
 * Toast/banner verde que aparece después de detener una sesión cronometrada,
 * mostrando cuánto tiempo se registró. Después de unos segundos limpia el
 * query param `?logged=` para que un refresh no vuelva a mostrarlo.
 *
 * Mensaje contextual:
 *  - STOP normal     → "Registraste X en esta tarea"
 *  - SWITCH (?from)  → "Cambiaste de tarea. Registraste X en la anterior"
 *  - Auto-stop (DONE)→ "Registraste X. La tarea quedó como Hecho"
 *    (Para este caso usaríamos otro param. Por ahora cae en "esta tarea".)
 */
export function TimeLoggedBanner({ minutes, fromTaskId, taskId }: Props) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Limpia el query param después de 6s, pero el banner se queda visible hasta
    // que el usuario haga otra acción que cause re-render del page.
    const t = setTimeout(() => {
      // Strip ?logged y ?from de la URL sin recargar.
      router.replace(`/task/${taskId}`, { scroll: false });
    }, 6000);
    return () => clearTimeout(t);
  }, [router, taskId]);

  if (!visible) return null;

  const label = formatDuration(minutes);
  const message = fromTaskId
    ? `Cambiaste de tarea. Registraste ${label} en la anterior.`
    : `Registraste ${label} en esta tarea.`;

  return (
    <div className="mb-6 flex items-start justify-between gap-3 rounded-2xl bg-accent-lime/10 border border-accent-lime/30 px-4 py-3 animate-fade-up">
      <div className="flex items-start gap-2.5">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mt-0.5 shrink-0 text-accent-lime"
          aria-hidden
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        <p className="text-[13px] text-accent-lime">
          <strong className="font-semibold">{message}</strong>
        </p>
      </div>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Descartar"
        className="shrink-0 rounded-full p-1 text-accent-lime/70 transition hover:text-accent-lime hover:bg-accent-lime/10"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}
