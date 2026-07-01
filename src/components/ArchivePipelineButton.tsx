"use client";

import { archivePipeline, unarchivePipeline } from "@/app/actions/pipeline";

type Props = {
  pipelineId: string;
  pipelineName: string;
  isArchived: boolean;
  /** Tareas del pipeline que NO están DONE (para avisar al PM si quedan activas). */
  openTaskCount: number;
};

/**
 * Botón para archivar / desarchivar un pipeline.
 *
 * Archivar: pide confirmación. Si el pipeline tiene tareas activas que no
 * están DONE, la confirmación menciona explícitamente que esas tareas siguen
 * apareciendo en kanban/inboxes/calendario — el archivo solo esconde el
 * pipeline del listado, no las tareas individuales.
 *
 * Desarchivar: acción directa, sin confirmación (es reversible sin daño).
 */
export function ArchivePipelineButton({
  pipelineId,
  pipelineName,
  isArchived,
  openTaskCount,
}: Props) {
  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    if (isArchived) return; // desarchivar es reversible sin daño, sin confirmar

    const warning =
      openTaskCount > 0
        ? `\n\n⚠️ Este pipeline tiene ${openTaskCount} tarea${openTaskCount === 1 ? "" : "s"} sin cerrar. Esas tareas seguirán apareciendo en el kanban, inboxes y calendario. Si quieres esconderlas también, cierra/archiva cada una individualmente primero.`
        : "";

    const message = `¿Archivar "${pipelineName}"?\n\nEl pipeline dejará de aparecer en la lista de activos. Podrás encontrarlo en la pestaña "Archivados" y desarchivarlo en cualquier momento.${warning}`;

    if (!window.confirm(message)) e.preventDefault();
  };

  return (
    <form
      action={isArchived ? unarchivePipeline : archivePipeline}
      onSubmit={handleSubmit}
      onClick={(e) => e.stopPropagation()}
    >
      <input type="hidden" name="id" value={pipelineId} />
      <button
        type="submit"
        className={
          isArchived
            ? "inline-flex items-center gap-1.5 rounded-full bg-accent-lime px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-on-accent transition hover:bg-accent-lime/85 active:scale-[0.98]"
            : "inline-flex items-center gap-1.5 rounded-full bg-cream-50 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-700 border border-ink-300/40 transition hover:bg-cream-200 hover:text-ink-900"
        }
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="3" y="4" width="18" height="4" rx="1" />
          <path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4" />
        </svg>
        {isArchived ? "Desarchivar" : "Archivar"}
      </button>
    </form>
  );
}
