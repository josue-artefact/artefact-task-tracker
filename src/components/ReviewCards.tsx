"use client";

import { useState } from "react";
import { submitForReview, approveReview, returnReview } from "@/app/actions/tasks";

type Reviewer = { id: string; handle: string; name: string };

/* ----------------------- Solicitar revisión ----------------------- */

export function SubmitForReviewCard({
  taskId,
  reviewers,
}: {
  taskId: string;
  reviewers: Reviewer[];
}) {
  return (
    <details className="group rounded-2xl bg-cream-100 border border-ink-300/30 animate-fade-up">
      <summary className="flex cursor-pointer items-center justify-between px-6 py-4 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-ink-500">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent-warning"
            aria-hidden
          >
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Solicitar revisión
        </div>
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-ink-500 transition-transform duration-300 group-open:rotate-90"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </summary>

      <form action={submitForReview} className="space-y-3 px-6 pb-5">
        <input type="hidden" name="taskId" value={taskId} />

        <label className="block">
          <div className="mb-1.5 text-[10px] uppercase tracking-[0.22em] text-ink-500">
            Reviewer
          </div>
          <select
            name="reviewerId"
            required
            defaultValue=""
            className="w-full rounded-xl bg-cream-50 border border-ink-300/40 px-3 py-2.5 text-[13px] text-ink-900 transition-colors focus:outline-none focus:border-accent-lime/40"
          >
            <option value="" disabled>Elige a quién…</option>
            {reviewers.map((r) => (
              <option key={r.id} value={r.id}>{r.name} · @{r.handle}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-[12px] text-ink-700">
          <input
            type="checkbox"
            name="reviewerIsClient"
            className="h-3.5 w-3.5 rounded border-ink-300 accent-accent-lime"
          />
          El sign-off final lo da el cliente (el reviewer del equipo solo coordina)
        </label>

        <label className="block">
          <div className="mb-1.5 text-[10px] uppercase tracking-[0.22em] text-ink-500">
            Nota para el reviewer (opcional)
          </div>
          <textarea
            name="note"
            rows={2}
            placeholder="ej. 'Está listo el primer corte, falta confirmar copy con cliente'"
            className="w-full resize-none rounded-xl bg-cream-50 border border-ink-300/40 px-3 py-2.5 text-[13px] text-ink-900 placeholder:text-ink-400 transition-colors focus:outline-none focus:border-accent-lime/40"
          />
        </label>

        <div className="flex justify-end">
          <button
            type="submit"
            className="group flex items-center gap-1 rounded-full bg-accent-warning py-2 pl-5 pr-2 text-[12px] font-medium uppercase tracking-[0.18em] text-on-accent transition-all duration-300 hover:bg-accent-warning/85 active:scale-[0.98]"
          >
            <span>Enviar a revisión</span>
            <span className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-on-accent/15 transition group-hover:translate-x-0.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </button>
        </div>
      </form>
    </details>
  );
}

/* ----------------------- Acciones del reviewer ----------------------- */

export function ReviewerActionsCard({
  taskId,
  reviewerName,
  reviewerIsClient,
  requestedAt,
}: {
  taskId: string;
  reviewerName: string;
  reviewerIsClient: boolean;
  requestedAt: string; // ISO
}) {
  const [showReturn, setShowReturn] = useState(false);

  return (
    <div className="rounded-2xl bg-accent-warning/10 border border-accent-warning/30 p-6 animate-fade-up">
      <div className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-accent-warning">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        Revisión pendiente
      </div>

      <p className="mb-4 text-[13px] text-ink-700">
        Esperas tu revisión{" "}
        {reviewerIsClient ? (
          <>
            como <strong className="text-accent-warning">coordinador con el cliente</strong>.
            Aprueba cuando confirme el cliente.
          </>
        ) : (
          <>como reviewer interno.</>
        )}
      </p>

      <div className="flex flex-wrap gap-2">
        <form action={approveReview}>
          <input type="hidden" name="taskId" value={taskId} />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-full bg-accent-lime px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-on-accent transition hover:bg-accent-lime/85 active:scale-[0.98]"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12l5 5L20 7" />
            </svg>
            Aprobar
          </button>
        </form>

        <button
          type="button"
          onClick={() => setShowReturn((s) => !s)}
          className="inline-flex items-center gap-1.5 rounded-full bg-cream-50 border border-ink-300/40 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-700 transition hover:bg-cream-200 hover:text-ink-900"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 14l-4-4 4-4M5 10h11a4 4 0 0 1 0 8h-1" />
          </svg>
          Devolver con comentarios
        </button>
      </div>

      {showReturn && (
        <form action={returnReview} className="mt-4 space-y-2 animate-fade-up">
          <input type="hidden" name="taskId" value={taskId} />
          <textarea
            name="reason"
            rows={3}
            required
            placeholder="Explica qué falta o qué cambiar (queda como comentario en la tarea)"
            className="w-full resize-none rounded-xl bg-cream-50 border border-ink-300/40 px-3 py-2.5 text-[13px] text-ink-900 placeholder:text-ink-400 transition-colors focus:outline-none focus:border-accent-warning/50"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowReturn(false)}
              className="rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-ink-500 transition hover:text-ink-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-full bg-accent-warning px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-on-accent transition hover:bg-accent-warning/85"
            >
              Devolver al colaborador
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ----------------------- Esperando revisión (vista del assignee) ----------------------- */

export function AwaitingReviewCard({
  reviewerName,
  reviewerHandle,
  reviewerIsClient,
}: {
  reviewerName: string;
  reviewerHandle: string;
  reviewerIsClient: boolean;
}) {
  return (
    <div className="rounded-2xl bg-cream-100 border border-ink-300/30 p-6 animate-fade-up">
      <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-ink-500">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-accent-warning"
          aria-hidden
        >
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        En revisión
      </div>
      <p className="text-[14px] text-ink-700 leading-relaxed">
        Esperando aprobación de{" "}
        <strong className="text-ink-900">{reviewerName}</strong>{" "}
        <span className="font-mono text-[11px] text-ink-500">(@{reviewerHandle})</span>
        {reviewerIsClient && (
          <> · el sign-off real viene del cliente</>
        )}
        .
      </p>
    </div>
  );
}
