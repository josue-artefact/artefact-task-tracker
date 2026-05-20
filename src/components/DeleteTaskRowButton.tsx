"use client";

import { deletePipelineTask } from "@/app/actions/pipeline";

type Props = {
  taskId: string;
  taskTitle: string;
};

/**
 * Botón "borrar tarea" para la lista del pipeline. Pide confirmación porque
 * borra time entries, comentarios y transferencias asociadas en cascada.
 */
export function DeleteTaskRowButton({ taskId, taskTitle }: Props) {
  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    const ok = window.confirm(
      `¿Borrar "${taskTitle}"?\n\nEsta acción elimina la tarea, su tiempo registrado y comentarios. No se puede deshacer.`,
    );
    if (!ok) e.preventDefault();
  };

  return (
    <form action={deletePipelineTask} onSubmit={handleSubmit}>
      <input type="hidden" name="taskId" value={taskId} />
      <button
        type="submit"
        aria-label="Borrar tarea"
        title="Borrar tarea"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-cream-50 border border-ink-300/40 text-ink-500 transition hover:bg-accent-rust hover:text-on-accent hover:border-accent-rust"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
        </svg>
      </button>
    </form>
  );
}
