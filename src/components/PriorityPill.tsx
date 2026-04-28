import { priorityDot, priorityLabel } from "@/lib/format";

export function PriorityPill({ priority }: { priority: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-900/[0.04] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-700 ring-1 ring-ink-900/5">
      <span className={`h-1.5 w-1.5 rounded-full ${priorityDot(priority)}`} />
      {priorityLabel(priority)}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const dot = {
    TODO: "bg-ink-300",
    DOING: "bg-accent-lime",
    DONE: "bg-ink-900",
  }[status] ?? "bg-ink-300";
  const label = { TODO: "To do", DOING: "Doing", DONE: "Done" }[status] ?? status;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-900/[0.04] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-700 ring-1 ring-ink-900/5">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
