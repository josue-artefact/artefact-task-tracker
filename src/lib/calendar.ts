/**
 * Algoritmo de scheduling automático para el calendario por colaborador.
 *
 * Versión dependency-aware (parte de Feature 2B): el scheduler corre
 * GLOBALMENTE (todas las personas a la vez) para que las dependencias entre
 * tareas asignadas a distintos colaboradores se resuelvan correctamente.
 *
 * Ejemplo: Pipeline "Matriz Majadas" tiene:
 *   - Task A — Creatividad (6h, Marce)
 *   - Task B — Diseño (14h, Frida, blockedBy A)
 *
 * El scheduler computa que A termina el martes en el calendario de Marce, y
 * agenda B a partir del miércoles en el calendario de Frida. La página filtra
 * los bloques al usuario visible.
 *
 * MVP — pendientes para iteraciones futuras:
 * - Tareas inamovibles (fijadas a una fecha específica)
 * - Capacidad configurable por persona
 * - Drag-and-drop manual
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
  assigneeId: string;
  blockedByTaskId: string | null;
  /** Si está set, la tarea es inamovible y vive en esta fecha. */
  scheduledAt: Date | null;
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
  /** Total de partes en la que se partió esta tarea. */
  totalParts: number;
  /** Cuál parte es esta (1-indexed). */
  partIndex: number;
  /** Si esta tarea arrancó tarde porque esperaba una predecesora, el título de esa. */
  predecessorTitle: string | null;
  /** True si esta tarea es inamovible (tiene scheduledAt set). */
  isFixed: boolean;
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

function priorityCompare(a: SchedulableTask, b: SchedulableTask): number {
  if (a.status === "DOING" && b.status !== "DOING") return -1;
  if (b.status === "DOING" && a.status !== "DOING") return 1;

  const pDiff = priorityRank(a.priority) - priorityRank(b.priority);
  if (pDiff !== 0) return pDiff;

  if (a.dueDate && !b.dueDate) return -1;
  if (b.dueDate && !a.dueDate) return 1;
  if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();

  return a.createdAt.getTime() - b.createdAt.getTime();
}

/**
 * Algoritmo de scheduling global con dependencias + tareas inamovibles +
 * capacidad por usuario.
 *
 * Maneja:
 * - Tareas fijas (`scheduledAt`): se colocan PRIMERO en su fecha exacta,
 *   consumiendo capacidad. El resto del schedule fluye alrededor.
 * - Topological sort: tasks con predecessor sin completar esperan
 * - Per-user capacity con override individual (User.dailyCapacityMinutes)
 * - Multi-day splits: tareas que exceden capacidad del día se parten
 * - Cross-user deps: si B (Frida) depende de A (Marce), B espera el end-day de A
 *
 * `startDate` debe ser pasado por el caller — la lib es pura.
 *
 * `capacityByUser` es un mapping userId → minutes/día. Para usuarios fuera del
 * map, se usa `defaultCapacityMinutes` (que default a DEFAULT_DAILY_CAPACITY_MIN).
 */
export function scheduleTasks(
  tasks: SchedulableTask[],
  opts: {
    startDate: Date;
    /** Override de capacidad por usuario. Si no, default global. */
    capacityByUser?: Map<string, number>;
    /** Capacidad default cuando un user no está en el map. */
    defaultCapacityMinutes?: number;
    /** @deprecated Usar `defaultCapacityMinutes`. Mantenido por compat. */
    capacityMinutesPerDay?: number;
  },
): ScheduledBlock[] {
  const defaultCapacity =
    opts.defaultCapacityMinutes ?? opts.capacityMinutesPerDay ?? DEFAULT_DAILY_CAPACITY_MIN;
  const baseDate = startOfDay(opts.startDate);

  // Filtra schedulable: estimate > 0, no DONE, no REVIEW, assignee set.
  const schedulable = tasks.filter(
    (t) =>
      t.estimatedMinutes > 0 &&
      t.status !== "DONE" &&
      t.status !== "REVIEW" &&
      t.assigneeId,
  );

  const taskMap = new Map(schedulable.map((t) => [t.id, t]));

  // Per-user day capacity: Map<userId, Map<dateIso, remainingMinutes>>
  const userDayCapacity = new Map<string, Map<string, number>>();
  function userDailyCap(userId: string): number {
    return opts.capacityByUser?.get(userId) ?? defaultCapacity;
  }
  function getRemaining(userId: string, date: Date): number {
    let userCap = userDayCapacity.get(userId);
    if (!userCap) {
      userCap = new Map();
      userDayCapacity.set(userId, userCap);
    }
    const key = dateToIso(date);
    if (!userCap.has(key)) userCap.set(key, userDailyCap(userId));
    return userCap.get(key)!;
  }
  function consume(userId: string, date: Date, minutes: number): void {
    const userCap = userDayCapacity.get(userId)!;
    const key = dateToIso(date);
    userCap.set(key, getRemaining(userId, date) - minutes);
  }

  const taskEndDay = new Map<string, Date>();
  const blocks: ScheduledBlock[] = [];

  // ───────────────────────────────────────────────────────────────────
  // PASO 1: tareas fijas (scheduledAt != null) se colocan PRIMERO.
  // Estas no se mueven por prioridad ni dependencia — viven en su fecha.
  // Consumen capacidad del/los día(s) en los que caen.
  // ───────────────────────────────────────────────────────────────────
  const fixedTasks = schedulable.filter((t) => t.scheduledAt != null);
  for (const task of fixedTasks) {
    let currentDay = startOfDay(task.scheduledAt!);
    // Si scheduledAt cae en weekend, lo respetamos igual (puede ser un shoot
    // de sábado). El user puede mover la fecha si fue error.
    let remaining = task.estimatedMinutes;
    const parts: ScheduledBlock[] = [];
    let partIdx = 0;

    while (remaining > 0) {
      // Para fixed tasks, NO saltamos a "next workday" si la capacidad está
      // llena — la fecha es ley. El bloque se mete aunque el día esté en
      // overcommit (UI lo muestra como ≥100%).
      const dailyCap = userDailyCap(task.assigneeId);
      const slot = Math.min(remaining, dailyCap);
      partIdx++;
      parts.push({
        taskId: task.id,
        task,
        date: new Date(currentDay),
        durationMinutes: slot,
        isContinuation: partIdx > 1,
        totalParts: 0,
        partIndex: partIdx,
        predecessorTitle: null,
        isFixed: true,
      });
      consume(task.assigneeId, currentDay, slot);
      remaining -= slot;
      if (remaining > 0) {
        // Tarea fija multi-día: avanza al siguiente workday (no más weekends
        // para los días subsecuentes, eso es trabajo continuo)
        currentDay = nextWorkday(currentDay);
      }
    }
    const total = parts.length;
    for (const p of parts) p.totalParts = total;
    blocks.push(...parts);
    taskEndDay.set(task.id, currentDay);
  }

  // ───────────────────────────────────────────────────────────────────
  // PASO 2: tareas flexibles via topological sort + dependency-aware.
  // ───────────────────────────────────────────────────────────────────
  const flexibleTasks = schedulable.filter((t) => t.scheduledAt == null);

  // Construir grafo de dependencias entre flexibles. Si una flexible depende
  // de una fija, también respetamos esa dependencia (la fija ya fue scheduled
  // y su endDay está en taskEndDay).
  const indegree = new Map<string, number>();
  const successors = new Map<string, string[]>();
  for (const t of flexibleTasks) {
    indegree.set(t.id, 0);
    successors.set(t.id, []);
  }
  for (const t of flexibleTasks) {
    if (t.blockedByTaskId && taskMap.has(t.blockedByTaskId)) {
      // Si la predecesora es fija, ya está en taskEndDay y no entra al grafo
      // de pendientes. La trato como "ya cumplida" para indegree.
      const pred = taskMap.get(t.blockedByTaskId)!;
      if (pred.scheduledAt == null) {
        indegree.set(t.id, (indegree.get(t.id) ?? 0) + 1);
        const succ = successors.get(pred.id);
        if (succ) succ.push(t.id);
      }
    }
  }

  const ready = new Set<string>();
  for (const [id, d] of indegree) {
    if (d === 0) ready.add(id);
  }

  while (ready.size > 0) {
    const readyTasks = [...ready].map((id) => taskMap.get(id)!).sort(priorityCompare);
    const task = readyTasks[0];
    ready.delete(task.id);

    // Earliest start: max(baseDate, predEndDay + 1 workday)
    let taskStartDate = baseDate;
    let predecessorTitle: string | null = null;
    if (task.blockedByTaskId && taskEndDay.has(task.blockedByTaskId)) {
      const predEndDay = taskEndDay.get(task.blockedByTaskId)!;
      taskStartDate = nextWorkday(predEndDay);
      predecessorTitle = taskMap.get(task.blockedByTaskId)?.title ?? null;
    }
    if (!isWorkday(taskStartDate)) taskStartDate = nextWorkday(taskStartDate);

    let currentDay = taskStartDate;
    let remaining = task.estimatedMinutes;
    const parts: ScheduledBlock[] = [];
    let partIdx = 0;

    while (remaining > 0) {
      let available = getRemaining(task.assigneeId, currentDay);
      while (available <= 0) {
        currentDay = nextWorkday(currentDay);
        available = getRemaining(task.assigneeId, currentDay);
      }
      const slot = Math.min(remaining, available);
      partIdx++;
      parts.push({
        taskId: task.id,
        task,
        date: new Date(currentDay),
        durationMinutes: slot,
        isContinuation: partIdx > 1,
        totalParts: 0,
        partIndex: partIdx,
        predecessorTitle: partIdx === 1 ? predecessorTitle : null,
        isFixed: false,
      });
      consume(task.assigneeId, currentDay, slot);
      remaining -= slot;
    }

    const total = parts.length;
    for (const p of parts) p.totalParts = total;
    blocks.push(...parts);
    taskEndDay.set(task.id, currentDay);

    for (const succId of successors.get(task.id) ?? []) {
      indegree.set(succId, (indegree.get(succId) ?? 1) - 1);
      if ((indegree.get(succId) ?? 0) === 0) ready.add(succId);
    }
  }

  // Defensa: detectar ciclos
  const unscheduled = [...indegree.keys()].filter((id) => !taskEndDay.has(id));
  if (unscheduled.length > 0 && process.env.NODE_ENV === "development") {
    console.warn(
      `[calendar] ${unscheduled.length} task(s) no scheduled (cycle?): ${unscheduled.join(", ")}`,
    );
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
