"use client";

import { deletePipeline } from "@/app/actions/pipeline";

type Props = {
  pipelineId: string;
  pipelineName: string;
  taskCount: number;
};

/**
 * Botón "Borrar pipeline" con confirmación.
 *
 * Esta acción borra el pipeline + TODAS sus tareas en cascada (incluye time
 * entries, comentarios, transferencias). Antes era posible borrar el pipeline
 * dejando huérfanas las tareas, lo que generaba zombies en los inboxes — bug
 * reportado en 2026-05-20.
 */
export function DeletePipelineButton({ pipelineId, pipelineName, taskCount }: Props) {
  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    const message =
      taskCount > 0
        ? `¿Borrar "${pipelineName}"?\n\nEsta acción elimina el pipeline y sus ${taskCount} ${taskCount === 1 ? "tarea" : "tareas"} asociadas (incluyendo tiempo registrado y comentarios). No se puede deshacer.`
        : `¿Borrar "${pipelineName}"?\n\nEl pipeline no tiene tareas asociadas. No se puede deshacer.`;

    if (!window.confirm(message)) {
      e.preventDefault();
    }
  };

  return (
    <form action={deletePipeline} onSubmit={handleSubmit}>
      <input type="hidden" name="id" value={pipelineId} />
      <button
        type="submit"
        className="rounded-full bg-cream-50 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-accent-rust border border-accent-rust/30 transition hover:bg-accent-rust hover:text-on-accent hover:border-accent-rust"
      >
        Borrar
      </button>
    </form>
  );
}
