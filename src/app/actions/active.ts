"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

/** Cap por sesión auto-trackeada. Si alguien olvidó apagar, no contamos más de un día. */
const MAX_SESSION_MINUTES = 8 * 60; // 480
/** Por debajo de esto se considera misclick y NO se loguea. */
const MIN_LOG_MINUTES = 1;

/**
 * Cierra una sesión activa: calcula elapsed, capea a 8h, y crea un TimeEntry
 * con source="TIMER". Devuelve los minutos efectivamente registrados, o null
 * si no había sesión / fue muy corta.
 *
 * No revalida ni redirige — el caller decide qué hacer con el resultado.
 */
async function closeAndLogSession(
  userId: string,
  activeTaskId: string,
  activeSince: Date,
): Promise<number | null> {
  const rawMinutes = Math.floor((Date.now() - activeSince.getTime()) / 60_000);
  const capped = Math.min(rawMinutes, MAX_SESSION_MINUTES);

  if (capped < MIN_LOG_MINUTES) return null;

  // La tarea pudo haber sido borrada mientras el usuario tenía sesión activa.
  // No revivimos: simplemente descartamos el log.
  const task = await prisma.task.findUnique({ where: { id: activeTaskId } });
  if (!task) return null;

  // loggedFor usa la fecha en la que arrancó la sesión (00:00 local de ese día).
  // Para sesiones que cruzan medianoche, todo el tiempo se imputa al día de inicio.
  // El usuario puede editar la entry manualmente si quiere repartir.
  const dayStart = new Date(activeSince);
  dayStart.setHours(0, 0, 0, 0);

  await prisma.timeEntry.create({
    data: {
      taskId: activeTaskId,
      userId,
      minutes: capped,
      loggedFor: dayStart,
      source: "TIMER",
      note: rawMinutes > MAX_SESSION_MINUTES
        ? `Sesión cronometrada (cap 8h aplicado — sesión real ~${Math.round(rawMinutes / 60)}h)`
        : null,
    },
  });

  return capped;
}

/**
 * Toggle del estado "active now" del usuario actual sobre una tarea.
 *
 * Comportamiento:
 * - START (no había activa)  → marca esta como activa
 * - STOP  (esta era la activa)→ cierra sesión + loguea tiempo automáticamente
 * - SWITCH (otra estaba activa) → cierra la anterior con auto-log, abre esta
 *
 * Si se loguea tiempo, redirige con `?logged=<min>[&from=<taskId>]` para que
 * el banner del task detail muestre confirmación.
 */
export async function toggleActiveTask(formData: FormData) {
  const user = await requireUser();
  const taskId = formData.get("taskId") as string;
  if (!taskId) return;

  // Validar que la tarea existe
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  const previousActiveId = user.activeTaskId;
  const previousSince = user.activeSince;

  // STOP: tocaste el toggle de la misma tarea en la que estabas activo
  if (previousActiveId === taskId && previousSince) {
    const loggedMinutes = await closeAndLogSession(user.id, taskId, previousSince);
    await prisma.user.update({
      where: { id: user.id },
      data: { activeTaskId: null, activeSince: null },
    });
    revalidatePath(`/task/${taskId}`);
    revalidatePath("/admin");
    revalidatePath("/inbox");
    revalidatePath("/admin/insights");
    if (loggedMinutes !== null) {
      redirect(`/task/${taskId}?logged=${loggedMinutes}`);
    }
    return;
  }

  // SWITCH: estabas activo en otra tarea y tocaste el toggle de esta
  if (previousActiveId && previousActiveId !== taskId && previousSince) {
    const loggedMinutes = await closeAndLogSession(user.id, previousActiveId, previousSince);
    await prisma.user.update({
      where: { id: user.id },
      data: { activeTaskId: taskId, activeSince: new Date() },
    });
    revalidatePath(`/task/${taskId}`);
    revalidatePath(`/task/${previousActiveId}`);
    revalidatePath("/admin");
    revalidatePath("/inbox");
    revalidatePath("/admin/insights");
    if (loggedMinutes !== null) {
      redirect(`/task/${taskId}?logged=${loggedMinutes}&from=${previousActiveId}`);
    }
    return;
  }

  // START: no había sesión previa
  await prisma.user.update({
    where: { id: user.id },
    data: { activeTaskId: taskId, activeSince: new Date() },
  });
  revalidatePath(`/task/${taskId}`);
  revalidatePath("/admin");
  revalidatePath("/inbox");
}

/**
 * Helper exportado para que `setStatus` pueda auto-cerrar la sesión cuando
 * la tarea pasa a DONE. Hace lo mismo que closeAndLogSession pero también
 * limpia el active state del usuario.
 *
 * Devuelve los minutos logueados o null.
 */
export async function autoStopIfActive(userId: string, taskId: string): Promise<number | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeTaskId: true, activeSince: true },
  });
  if (!u?.activeTaskId || u.activeTaskId !== taskId || !u.activeSince) return null;

  const logged = await closeAndLogSession(userId, taskId, u.activeSince);
  await prisma.user.update({
    where: { id: userId },
    data: { activeTaskId: null, activeSince: null },
  });
  return logged;
}
