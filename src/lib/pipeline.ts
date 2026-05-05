/**
 * Lógica de cálculo de riesgo para pipelines y sus tareas.
 *
 * Un pipeline puede estar en uno de tres estados de salud:
 *   GREEN  — todo en tiempo, sin tareas vencidas ni bloqueos críticos
 *   AMBER  — alguna tarea bloqueada por predecesora atrasada (en riesgo de retraso)
 *   RED    — al menos una tarea ya está vencida o bloqueada por cliente >5 días
 *
 * Una tarea individual puede estar:
 *   on_track       — sin issues
 *   blocked_by_pred — predecesora aún no terminada (espera lógica)
 *   blocked_by_client — esperando aprobación del cliente
 *   at_risk        — propia dueDate aún no llega pero predecesora atrasada
 *   overdue        — propia dueDate ya pasó y no está DONE
 */

const CLIENT_BLOCK_RED_DAYS = 5; // bloqueada por cliente >5 días → RED

export type TaskRiskState =
  | "on_track"
  | "blocked_by_pred"
  | "blocked_by_client"
  | "at_risk"
  | "overdue";

export type PipelineHealth = "GREEN" | "AMBER" | "RED";

type RiskTask = {
  id: string;
  status: string;
  dueDate: Date | null;
  blockedByTaskId: string | null;
  blockedByClient: boolean;
  blockedSince: Date | null;
};

/** Calcula el estado de riesgo de una tarea, dado el array de todas las tareas del pipeline. */
export function getTaskRisk(task: RiskTask, allTasksInPipeline: RiskTask[]): TaskRiskState {
  if (task.status === "DONE") return "on_track";

  const now = Date.now();

  // Vencida — la propia dueDate ya pasó
  if (task.dueDate && task.dueDate.getTime() < now) {
    return "overdue";
  }

  // Esperando cliente
  if (task.blockedByClient) {
    return "blocked_by_client";
  }

  // Bloqueada por predecesora no terminada
  if (task.blockedByTaskId) {
    const pred = allTasksInPipeline.find((t) => t.id === task.blockedByTaskId);
    if (pred && pred.status !== "DONE") {
      // Si la predecesora está vencida → esta tarea está "en riesgo" anticipado
      if (pred.dueDate && pred.dueDate.getTime() < now) {
        return "at_risk";
      }
      return "blocked_by_pred";
    }
  }

  return "on_track";
}

/** Calcula la salud global de un pipeline. */
export function getPipelineHealth(tasks: RiskTask[]): PipelineHealth {
  if (tasks.length === 0) return "GREEN";

  const now = Date.now();
  const redCutoff = now - CLIENT_BLOCK_RED_DAYS * 24 * 60 * 60 * 1000;

  let hasAmber = false;
  for (const t of tasks) {
    if (t.status === "DONE") continue;

    // RED: vencida
    if (t.dueDate && t.dueDate.getTime() < now) return "RED";

    // RED: bloqueada por cliente desde hace mucho
    if (t.blockedByClient && t.blockedSince && t.blockedSince.getTime() < redCutoff) return "RED";

    // AMBER: esperando cliente (poco tiempo) o predecesora atrasada
    if (t.blockedByClient) {
      hasAmber = true;
      continue;
    }
    if (t.blockedByTaskId) {
      const pred = tasks.find((p) => p.id === t.blockedByTaskId);
      if (pred && pred.status !== "DONE" && pred.dueDate && pred.dueDate.getTime() < now) {
        hasAmber = true;
      }
    }
  }

  return hasAmber ? "AMBER" : "GREEN";
}

/** Progreso de un pipeline (0-100 basado en tareas DONE / total). */
export function getPipelineProgress(tasks: { status: string }[]): number {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.status === "DONE").length;
  return Math.round((done / tasks.length) * 100);
}

export function healthLabel(health: PipelineHealth): string {
  return { GREEN: "En tiempo", AMBER: "En riesgo", RED: "Crítico" }[health];
}

export function healthDot(health: PipelineHealth): string {
  return {
    GREEN: "bg-accent-lime",
    AMBER: "bg-amber-500",
    RED: "bg-accent-rust",
  }[health];
}

export function taskRiskLabel(state: TaskRiskState): string {
  return {
    on_track: "En tiempo",
    blocked_by_pred: "Esperando predecesora",
    blocked_by_client: "Esperando cliente",
    at_risk: "En riesgo",
    overdue: "Vencida",
  }[state];
}

export function taskRiskTone(state: TaskRiskState): { bg: string; text: string } {
  return {
    on_track:         { bg: "bg-ink-900/[0.04]",      text: "text-ink-700" },
    blocked_by_pred:  { bg: "bg-ink-900/[0.08]",      text: "text-ink-600" },
    blocked_by_client: { bg: "bg-amber-100",          text: "text-amber-900" },
    at_risk:          { bg: "bg-amber-200",           text: "text-amber-900" },
    overdue:          { bg: "bg-accent-rust/15",      text: "text-accent-rust" },
  }[state];
}
