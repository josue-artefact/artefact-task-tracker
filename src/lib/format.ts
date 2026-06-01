export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const STATUSES = ["TODO", "DOING", "REVIEW", "DONE"] as const;

export type Priority = (typeof PRIORITIES)[number];
export type Status = (typeof STATUSES)[number];

export function priorityRank(p: string): number {
  return { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }[p as Priority] ?? 99;
}

/** Orden semántico de pipeline: TODO → DOING → REVIEW → DONE. */
export function statusRank(s: string): number {
  return { TODO: 0, DOING: 1, REVIEW: 2, DONE: 3 }[s as Status] ?? 99;
}

export function priorityLabel(p: string): string {
  return { URGENT: "Urgente", HIGH: "Alta", MEDIUM: "Media", LOW: "Baja" }[p as Priority] ?? p;
}

export function statusLabel(s: string): string {
  return { TODO: "Por hacer", DOING: "En curso", REVIEW: "Revisión", DONE: "Hecho" }[s as Status] ?? s;
}

export function priorityDot(p: string): string {
  return {
    URGENT: "bg-accent-rust",
    HIGH: "bg-accent-lime",
    MEDIUM: "bg-ink-600",
    LOW: "bg-ink-400",
  }[p as Priority] ?? "bg-ink-400";
}

export function statusDot(s: string): string {
  return {
    TODO: "bg-ink-500",
    DOING: "bg-accent-lime",
    REVIEW: "bg-accent-warning",
    DONE: "bg-ink-700",
  }[s as Status] ?? "bg-ink-500";
}

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function formatDateLong(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatRelative(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} d`;
  return formatDate(date);
}

/** True si la fecha (típicamente dueDate) ya pasó. */
export function isOverdue(d: Date | string | null | undefined): boolean {
  if (!d) return false;
  const date = typeof d === "string" ? new Date(d) : d;
  return date.getTime() < Date.now();
}
