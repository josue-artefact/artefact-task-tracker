"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, requirePM } from "@/lib/auth";
import { PRIORITIES, STATUSES } from "@/lib/format";
import { parseDuration } from "@/lib/time";
import {
  notifyAssigned,
  notifyTransferredFromMe,
  notifyCommented,
  notifyReviewRequested,
  notifyReviewApproved,
  notifyReviewReturned,
} from "@/lib/notify";
import { autoStopIfActive } from "./active";

export async function createTask(formData: FormData) {
  const pm = await requirePM();

  const title = (formData.get("title") as string)?.trim();
  const description = ((formData.get("description") as string) || "").trim() || null;
  const clientId = formData.get("clientId") as string;
  const teamId = formData.get("teamId") as string;
  const assigneeId = ((formData.get("assigneeId") as string) || "") || null;
  const priority = (formData.get("priority") as string) || "MEDIUM";
  const dueDateRaw = (formData.get("dueDate") as string) || "";
  const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;
  const estimateRaw = ((formData.get("estimate") as string) || "").trim();
  const estimatedMinutes = estimateRaw ? parseDuration(estimateRaw) : null;

  if (!title || !clientId || !teamId) return;
  if (!PRIORITIES.includes(priority as any)) return;

  const created = await prisma.task.create({
    data: {
      title,
      description,
      clientId,
      teamId,
      assigneeId: assigneeId || null,
      priority,
      dueDate,
      estimatedMinutes: estimatedMinutes && estimatedMinutes > 0 ? estimatedMinutes : null,
      createdById: pm.id,
    },
  });

  await notifyAssigned({
    taskId: created.id,
    taskTitle: created.title,
    assigneeId: created.assigneeId,
    fromUserId: pm.id,
  });

  revalidatePath("/admin");
  revalidatePath("/inbox");
  redirect("/admin");
}

export async function updateTask(formData: FormData) {
  const user = await requireUser();
  const id = formData.get("id") as string;
  if (!id) return;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return;

  // Members can only edit tasks assigned to them; PMs can edit anything.
  const canEdit = user.role === "PM" || task.assigneeId === user.id;
  if (!canEdit) return;

  const title = ((formData.get("title") as string) || "").trim();
  const description = ((formData.get("description") as string) || "").trim() || null;
  const dueDateRaw = (formData.get("dueDate") as string) || "";
  const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;

  // PMs can also reassign client/team. Members keep current values.
  const clientId =
    user.role === "PM" ? ((formData.get("clientId") as string) || task.clientId) : task.clientId;
  const teamId =
    user.role === "PM" ? ((formData.get("teamId") as string) || task.teamId) : task.teamId;

  if (!title) return;

  await prisma.task.update({
    where: { id },
    data: { title, description, dueDate, clientId, teamId },
  });

  revalidatePath("/admin");
  revalidatePath("/inbox");
  revalidatePath(`/task/${id}`);
}

export async function deleteTask(formData: FormData) {
  await requirePM();
  const id = formData.get("id") as string;
  if (!id) return;
  await prisma.task.delete({ where: { id } });
  revalidatePath("/admin");
  revalidatePath("/inbox");
}

export async function bulkDeleteTasks(formData: FormData) {
  await requirePM();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (ids.length === 0) return;
  await prisma.task.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/admin");
  revalidatePath("/inbox");
}

/**
 * Archiva una tarea (solo PM, solo cuando status=DONE).
 * Archivar = sacar de listados activos. Data preservada para insights/historial.
 */
export async function archiveTask(formData: FormData) {
  await requirePM();
  const id = formData.get("id") as string;
  if (!id) return;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return;
  if (task.status !== "DONE") return; // guard: solo DONE se archiva
  if (task.archivedAt) return; // ya está archivada

  await prisma.task.update({
    where: { id },
    data: { archivedAt: new Date() },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/archive");
  revalidatePath("/inbox");
  revalidatePath(`/task/${id}`);
}

/** Desarchiva una tarea (PM only). El status que tenía se preserva. */
export async function unarchiveTask(formData: FormData) {
  await requirePM();
  const id = formData.get("id") as string;
  if (!id) return;

  await prisma.task.updateMany({
    where: { id, archivedAt: { not: null } },
    data: { archivedAt: null },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/archive");
  revalidatePath("/inbox");
  revalidatePath(`/task/${id}`);
}

/**
 * Archiva en bulk las tareas seleccionadas que estén en DONE.
 * Las que no estén en DONE se ignoran silenciosamente — la UI ya filtra
 * el contador "X hechas", así que sólo deberían llegar IDs válidos.
 */
export async function bulkArchiveTasks(formData: FormData) {
  await requirePM();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (ids.length === 0) return;
  await prisma.task.updateMany({
    where: { id: { in: ids }, status: "DONE", archivedAt: null },
    data: { archivedAt: new Date() },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/archive");
  revalidatePath("/inbox");
}

export async function bulkAssignTasks(formData: FormData) {
  await requirePM();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const assigneeId = ((formData.get("assigneeId") as string) || "") || null;
  if (ids.length === 0) return;
  await prisma.task.updateMany({
    where: { id: { in: ids } },
    data: { assigneeId },
  });
  revalidatePath("/admin");
  revalidatePath("/inbox");
}

export async function setPriority(formData: FormData) {
  await requirePM();
  const id = formData.get("id") as string;
  const priority = formData.get("priority") as string;
  if (!id || !PRIORITIES.includes(priority as any)) return;
  await prisma.task.update({ where: { id }, data: { priority } });
  revalidatePath("/admin");
  revalidatePath(`/task/${id}`);
}

export async function setStatus(formData: FormData) {
  const user = await requireUser();
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  if (!id || !STATUSES.includes(status as any)) return;

  // REVIEW no se setea por esta vía — requiere reviewer asignado (usa submitForReview)
  if (status === "REVIEW") return;

  // Member can only update their own task; PM can update anything.
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return;
  if (user.role !== "PM" && task.assigneeId !== user.id) return;

  await prisma.task.update({ where: { id }, data: { status } });

  // Si la tarea pasa a DONE y el usuario actual estaba cronometrando aquí,
  // cerramos la sesión y la logueamos antes de salir. Evita que el "active state"
  // quede colgado en una tarea cerrada.
  let loggedMinutes: number | null = null;
  if (status === "DONE") {
    loggedMinutes = await autoStopIfActive(user.id, id);
  }

  revalidatePath("/admin");
  revalidatePath("/inbox");
  revalidatePath(`/task/${id}`);
  if (loggedMinutes !== null) {
    revalidatePath("/admin/insights");
    redirect(`/task/${id}?logged=${loggedMinutes}`);
  }
}

export async function addComment(formData: FormData) {
  const user = await requireUser();
  const taskId = formData.get("taskId") as string;
  const body = ((formData.get("body") as string) || "").trim();
  if (!taskId || !body) return;
  await prisma.comment.create({ data: { taskId, body, authorId: user.id } });

  // Notifica al assignee (si no es el mismo que comentó)
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { title: true, assigneeId: true },
  });
  if (task) {
    await notifyCommented({
      taskId,
      taskTitle: task.title,
      taskAssigneeId: task.assigneeId,
      fromUserId: user.id,
    });
  }

  revalidatePath(`/task/${taskId}`);
}

export async function transferTask(formData: FormData) {
  const user = await requireUser();
  const taskId = formData.get("taskId") as string;
  const toUserId = formData.get("toUserId") as string;
  const reason = ((formData.get("reason") as string) || "").trim() || null;
  if (!taskId || !toUserId) return;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return;
  // Member can only transfer tasks assigned to them; PM can transfer anything.
  if (user.role !== "PM" && task.assigneeId !== user.id) return;

  const fromUserId = task.assigneeId ?? user.id;

  await prisma.$transaction([
    prisma.task.update({ where: { id: taskId }, data: { assigneeId: toUserId } }),
    prisma.taskTransfer.create({
      data: { taskId, fromUserId, toUserId, reason },
    }),
  ]);

  // Notificar al nuevo asignado + al anterior (si era distinto del que ejecutó)
  await notifyAssigned({
    taskId,
    taskTitle: task.title,
    assigneeId: toUserId,
    fromUserId: user.id,
  });
  if (task.assigneeId && task.assigneeId !== toUserId) {
    await notifyTransferredFromMe({
      taskId,
      taskTitle: task.title,
      fromAssigneeId: task.assigneeId,
      toAssigneeId: toUserId,
      byUserId: user.id,
    });
  }

  revalidatePath("/admin");
  revalidatePath("/inbox");
  revalidatePath(`/task/${taskId}`);
}

/* ============================ Review workflow ============================ */

/**
 * Solicita revisión de una tarea — la pasa al status REVIEW asignando un
 * reviewer (User del equipo) que es quien hará el sign-off. Si el sign-off
 * real viene del cliente (no del equipo), `reviewerIsClient=true` señala
 * que el reviewer solo coordina con el cliente.
 *
 * Permisos: el assignee o un PM. Para acelerar el flujo, en este punto:
 *   - status: DOING (o TODO) → REVIEW
 *   - auto-stop del timer si tenía sesión activa
 *   - notificación al reviewer
 *
 * Form fields: taskId, reviewerId, reviewerIsClient? ("on" / undefined), note?
 */
export async function submitForReview(formData: FormData) {
  const user = await requireUser();
  const taskId = formData.get("taskId") as string;
  const reviewerId = formData.get("reviewerId") as string;
  if (!taskId || !reviewerId) return;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, title: true, status: true, assigneeId: true },
  });
  if (!task) return;
  if (task.status === "REVIEW" || task.status === "DONE") return; // ya está en review o terminada

  // Permisos: assignee o PM
  if (user.role !== "PM" && task.assigneeId !== user.id) return;

  // Verifica que el reviewer existe
  const reviewer = await prisma.user.findUnique({
    where: { id: reviewerId },
    select: { id: true },
  });
  if (!reviewer) return;

  const reviewerIsClient = formData.get("reviewerIsClient") === "on";
  const note = ((formData.get("note") as string) || "").trim();

  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: "REVIEW",
      reviewerId,
      reviewerIsClient,
      reviewRequestedAt: new Date(),
    },
  });

  // Auto-stop timer si el assignee tenía sesión activa
  await autoStopIfActive(user.id, taskId);

  // Comentario automático con la nota opcional (audit trail)
  if (note) {
    await prisma.comment.create({
      data: { taskId, body: `🔍 Solicitud de revisión: ${note}`, authorId: user.id },
    });
  }

  await notifyReviewRequested({
    taskId,
    taskTitle: task.title,
    reviewerId,
    reviewerIsClient,
    fromUserId: user.id,
  });

  revalidatePath(`/task/${taskId}`);
  revalidatePath("/admin");
  revalidatePath("/inbox");
}

/**
 * Aprueba la revisión — pasa la tarea a DONE. Solo el reviewer asignado
 * (o cualquier PM) puede aprobar.
 */
export async function approveReview(formData: FormData) {
  const user = await requireUser();
  const taskId = formData.get("taskId") as string;
  if (!taskId) return;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, title: true, status: true, reviewerId: true, assigneeId: true },
  });
  if (!task || task.status !== "REVIEW") return;

  // Permisos: el reviewer asignado o cualquier PM
  if (user.role !== "PM" && task.reviewerId !== user.id) return;

  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: "DONE",
      reviewerId: null,
      reviewerIsClient: false,
      reviewRequestedAt: null,
    },
  });

  await notifyReviewApproved({
    taskId,
    taskTitle: task.title,
    assigneeId: task.assigneeId,
    fromUserId: user.id,
  });

  revalidatePath(`/task/${taskId}`);
  revalidatePath("/admin");
  revalidatePath("/inbox");
  revalidatePath("/admin/insights");
}

/**
 * Devuelve la revisión al colaborador — la tarea vuelve a DOING. Requiere
 * un motivo (queda como comentario público) y notifica al assignee.
 */
export async function returnReview(formData: FormData) {
  const user = await requireUser();
  const taskId = formData.get("taskId") as string;
  const reason = ((formData.get("reason") as string) || "").trim();
  if (!taskId) return;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, title: true, status: true, reviewerId: true, assigneeId: true },
  });
  if (!task || task.status !== "REVIEW") return;

  if (user.role !== "PM" && task.reviewerId !== user.id) return;

  await prisma.$transaction([
    prisma.task.update({
      where: { id: taskId },
      data: {
        status: "DOING",
        reviewerId: null,
        reviewerIsClient: false,
        reviewRequestedAt: null,
      },
    }),
    // El comentario con el motivo queda visible en la historia
    ...(reason
      ? [prisma.comment.create({
          data: { taskId, body: `↩️ Devuelto en revisión: ${reason}`, authorId: user.id },
        })]
      : []),
  ]);

  await notifyReviewReturned({
    taskId,
    taskTitle: task.title,
    assigneeId: task.assigneeId,
    fromUserId: user.id,
    reason: reason || null,
  });

  revalidatePath(`/task/${taskId}`);
  revalidatePath("/admin");
  revalidatePath("/inbox");
}
