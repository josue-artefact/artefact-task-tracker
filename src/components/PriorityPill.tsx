import { priorityDot, priorityLabel } from "@/lib/format";

export function PriorityPill({ priority }: { priority: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-900/[0.04] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-700 ring-1 ring-ink-900/5">
      <span className={`h-1.5 w-1.5 rounded-full ${priorityDot(priority)}`} />
      {priorityLabel(priority)}
    </span>
  );
}

/**
 * Status pill con formas distintas por estado (no sólo color):
 *   TODO  → círculo hueco (pendiente / vacío)
 *   DOING → punto sólido lima (activo)
 *   DONE  → check (cumplido)
 * Las formas distintas garantizan que cada estado se reconozca de un golpe,
 * incluso con la pill chica.
 */
export function StatusPill({ status }: { status: string }) {
  const label = { TODO: "To do", DOING: "Doing", DONE: "Done" }[status] ?? status;

  let icon: React.ReactNode;
  if (status === "TODO") {
    icon = <span className="h-2 w-2 rounded-full border border-ink-500" />;
  } else if (status === "DOING") {
    icon = <span className="h-2 w-2 rounded-full bg-accent-lime" />;
  } else if (status === "DONE") {
    icon = (
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-accent-lime"
        aria-hidden
      >
        <path d="M5 12l5 5L20 7" />
      </svg>
    );
  } else {
    icon = <span className="h-2 w-2 rounded-full bg-ink-500" />;
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-900/[0.04] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-700 ring-1 ring-ink-900/5">
      {icon}
      {label}
    </span>
  );
}
