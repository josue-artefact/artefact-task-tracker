"use client";

import { useEffect, useState } from "react";
import { toggleActiveTask } from "@/app/actions/active";

type Props = {
  taskId: string;
  /** ISO string del activeSince del usuario, o null si no está activo. */
  activeSince: string | null;
  /** Está activo en ESTA tarea (no en otra). */
  isActiveOnThisTask: boolean;
  /** Está activo en OTRA tarea distinta. */
  isActiveOnOther: boolean;
  /** La tarea está en DONE — no permitimos iniciar sesión nueva. */
  isDone: boolean;
};

/** Umbral para mostrar el elapsed en el botón (segundos). */
const SHOW_ELAPSED_AFTER_MIN = 5;
/** Si la sesión supera esto al detener, pedimos confirmación. */
const CONFIRM_THRESHOLD_MIN = 5 * 60;

function formatElapsed(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Toggle "Empezar a trabajar / Detener" con cronómetro automático.
 *
 * - Cuando estás activo, tickea cada 30s y muestra el elapsed en el botón
 *   (a partir de 5 min, antes de eso no aporta nada al usuario).
 * - Al detener, si la sesión es > 5h pide confirmación para evitar registrar
 *   un día completo accidentalmente.
 */
export function ActiveTaskToggle({
  taskId,
  activeSince,
  isActiveOnThisTask,
  isActiveOnOther,
  isDone,
}: Props) {
  // Tick para refrescar el elapsed en vivo
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!isActiveOnThisTask) return;
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, [isActiveOnThisTask]);

  const elapsedMin = activeSince && isActiveOnThisTask
    ? Math.floor((now - new Date(activeSince).getTime()) / 60_000)
    : 0;

  const showElapsed = elapsedMin >= SHOW_ELAPSED_AFTER_MIN;

  // Bloqueamos arranque nuevo en tareas DONE (no tiene sentido cronometrar algo cerrado).
  // Detener una sesión activa en una DONE sí se permite (cleanup).
  const blockStart = isDone && !isActiveOnThisTask;

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    if (isActiveOnThisTask && elapsedMin >= CONFIRM_THRESHOLD_MIN) {
      const ok = window.confirm(
        `Estuviste ${formatElapsed(elapsedMin)} en esta tarea.\n\n` +
          `¿Registrar este tiempo? Si fue mucho menos (te olvidaste apagar), ` +
          `cancela para seguir activo y edita la entrada manualmente.`,
      );
      if (!ok) e.preventDefault();
    }
  };

  return (
    <form action={toggleActiveTask} onSubmit={handleSubmit}>
      <input type="hidden" name="taskId" value={taskId} />
      <button
        type="submit"
        disabled={blockStart}
        className={[
          "group flex w-full items-center justify-between gap-2 rounded-full py-2 pl-4 pr-2 text-[12px] font-medium uppercase tracking-[0.18em] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
          isActiveOnThisTask
            ? "bg-accent-lime text-on-accent hover:bg-accent-lime/85"
            : blockStart
              ? "bg-cream-100 text-ink-400 cursor-not-allowed border border-ink-300/30"
              : "bg-cream-300 text-ink-900 hover:bg-ink-800",
        ].join(" ")}
        title={blockStart ? "La tarea está marcada como Hecho" : undefined}
      >
        <span className="flex items-center gap-2">
          {isActiveOnThisTask ? (
            <>
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cream-50 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cream-50" />
              </span>
              <span>Detener</span>
              {showElapsed && (
                <span className="text-on-accent/80 font-mono normal-case tracking-tight text-[11px]">
                  · {formatElapsed(elapsedMin)}
                </span>
              )}
            </>
          ) : blockStart ? (
            "Tarea cerrada"
          ) : isActiveOnOther ? (
            "Cambiar a esta"
          ) : (
            "Empezar a trabajar"
          )}
        </span>
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-500 group-hover:translate-x-0.5 ${
            isActiveOnThisTask ? "bg-on-accent/15" : "bg-cream-100/15"
          }`}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {isActiveOnThisTask ? (
              <rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor" />
            ) : (
              <polygon points="6,4 20,12 6,20" fill="currentColor" />
            )}
          </svg>
        </span>
      </button>
    </form>
  );
}
