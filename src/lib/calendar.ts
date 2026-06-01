/**
 * Algoritmo de scheduling automático para el calendario por colaborador.
 *
 * Toma las tareas activas (TODO/DOING) de un usuario con `estimatedMinutes` set,
 * las ordena (DOING primero → prioridad → dueDate → createdAt) y las asigna a
 * slots de capacidad fija por día, saltándose fines de semana.
 *
 * MVP (Feature 2A): no respeta dependencias de pipeline ni tareas inamovibles.
 * Esas vienen en 2B.
 */

import { priorityRank } from "./format";

/** Capacidad default por día (en minutos). 6h = realista con meetings/admin. */
export const DEFAULT_DAILY_CAPACITY_MIN = 6 * 60;

/** Workdays = lunes (1) a viernes (5). Domingo=0, sábado=6 → excluidos. */
const WORKDAY_SET = new Set([1, 2, 3, 4, 5]);

export type SchedulableTask = {
  id: string;
  title: string;
  priority: string;
  status: string;
  estimatedMinutes: number;
  dueDate: Date | null;
  createdAt: Date;
  client: { name: string };
};

export type ScheduledBlock = {
  taskId: string;
  task: SchedulableTask;
  /** Fecha del bloque (00:00 local de ese día). */
  date: Date;
  /** Minutos que este bloque consume del día. */
  durationMinutes: number;
  /** True si es la 2ª, 3ª, ... porción de una tarea que se partió entre días. */
  isContinuation: boolean;
  /** Total de partes en la que se partió esta tarea (para mostrar "1/3", "2/3" etc.) */
  totalParts: number;
  /** Cuál parte es esta (1-indexed). */
  partIndex: number;
};

export function isWorkday(date: Date): boolean {
  return WORKDAY_SET.has(date.getDay());
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Lunes de la semana que contiene `date`, a 00:00 local. */
export function startOfWeekMonday(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay(); // 0=dom, 1=lun, ..., 6=sáb
  const offset = (day + 6) % 7; // días desde lunes
  d.setDate(d.getDate() - offset);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function nextWorkday(date: Date): Date {
  let d = addDays(date, 1);
  while (!isWorkday(d)) d = addDays(d, 1);
  return d;
}

/**
 * Algoritmo principal de scheduling. Ordena tareas según prioridad/due/created
 * y las acomoda en slots de capacidad consecutivos.
 *
 * `startDate` debe ser pasado por el caller — la lib es pura y no llama a
 * `new Date()` directamente (eso quedaría off durante SSG / tests).
 */
export function scheduleTasks(
  tasks: SchedulableTask[],
  opts: {
    startDate: Date;
    capacityMinutesPerDay?: number;
  },
): ScheduledBlock[] {
  const capacity = opts.capacityMinutesPerDay ?? DEFAULT_DAILY_CAPACITY_MIN;

  // Filtra schedulable: con estimate > 0, no DONE, no REVIEW (REVIEW está
  // fuera de las manos del assignee).
  const schedulable = tasks.filter(
    (t) =>
      t.estimatedMinutes > 0 &&
      t.status !== "DONE" &&
      t.status !== "REVIEW",
  );

  // Sort: DOING primero (ya empezadas), luego prioridad asc, luego dueDate
  // (más cercana primero, sin fecha al final), luego createdAt asc.
  const sorted = [...schedulable].sort((a, b) => {
    if (a.status === "DOING" && b.status !== "DOING") return -1;
    if (b.status === "DOING" && a.status !== "DOING") return 1;

    const pDiff = priorityRank(a.priority) - priorityRank(b.priority);
    if (pDiff !== 0) return pDiff;

    if (a.dueDate && !b.dueDate) return -1;
    if (b.dueDate && !a.dueDate) return 1;
    if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();

    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  // Asignar a slots, saltando weekends. Tasks que exceden la capacidad del día
  // se parten en bloques (multi-day).
  const blocks: ScheduledBlock[] = [];
  let currentDate = startOfDay(opts.startDate);
  if (!isWorkday(currentDate)) currentDate = nextWorkday(currentDate);
  let remainingToday = capacity;

  for (const task of sorted) {
    let taskRemaining = task.estimatedMinutes;
    const parts: ScheduledBlock[] = [];
    let partIdx = 0;

    while (taskRemaining > 0) {
      if (remainingToday <= 0) {
        currentDate = nextWorkday(currentDate);
        remainingToday = capacity;
      }
      const slot = Math.min(taskRemaining, remainingToday);
      partIdx++;
      parts.push({
        taskId: task.id,
        task,
        date: new Date(currentDate),
        durationMinutes: slot,
        isContinuation: partIdx > 1,
        totalParts: 0, // se completa después
        partIndex: partIdx,
      });
      taskRemaining -= slot;
      remainingToday -= slot;
    }

    // Patch totalParts ahora que sabemos cuántas son
    const total = parts.length;
    for (const p of parts) p.totalParts = total;

    blocks.push(...parts);
  }

  return blocks;
}

/** Genera los 5 días (lun-vie) de la semana que arranca en `weekStart`. */
export function weekDays(weekStart: Date): Date[] {
  return Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
}

/** Devuelve solo los bloques que caen entre `from` y `to` (inclusive). */
export function blocksInRange(
  blocks: ScheduledBlock[],
  from: Date,
  to: Date,
): ScheduledBlock[] {
  const fromT = from.getTime();
  const toT = to.getTime();
  return blocks.filter((b) => {
    const t = b.date.getTime();
    return t >= fromT && t <= toT;
  });
}

/** Formato corto YYYY-MM-DD para query params y storage. */
export function dateToIso(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Parsea YYYY-MM-DD a Date local 00:00. Devuelve null si formato inválido. */
export function isoToDate(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
}

/** Sumario por día de minutos totales (útil para mostrar capacidad usada). */
export function dayLoadSummary(
  blocks: ScheduledBlock[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const b of blocks) {
    const k = dateToIso(b.date);
    map.set(k, (map.get(k) ?? 0) + b.durationMinutes);
  }
  return map;
}
