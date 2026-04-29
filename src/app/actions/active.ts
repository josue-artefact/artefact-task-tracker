"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

/**
 * Toggle del estado "active now" del usuario actual sobre una tarea.
 *
 * - Si ya estoy activo en esta tarea  → se limpia (detener)
 * - Si no estoy activo (o estoy en otra) → se setea esta como activa
 *
 * Implícitamente, "cambiar a otra tarea" sustituye la activa anterior.
 */
export async function toggleActiveTask(formData: FormData) {
  const user = await requireUser();
  const taskId = formData.get("taskId") as string;
  if (!taskId) return;

  // Validate task exists
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  const previousActiveId = user.activeTaskId;
  const willBeActive = previousActiveId !== taskId;

  await prisma.user.update({
    where: { id: user.id },
    data: willBeActive
      ? { activeTaskId: taskId, activeSince: new Date() }
      : { activeTaskId: null, activeSince: null },
  });

  // Revalidate paths involved
  revalidatePath(`/task/${taskId}`);
  if (previousActiveId && previousActiveId !== taskId) {
    revalidatePath(`/task/${previousActiveId}`);
  }
  revalidatePath("/admin");
}
