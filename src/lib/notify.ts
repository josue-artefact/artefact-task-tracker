import { prisma } from "./db";
import { sendPushToUser } from "./push";

/**
 * Helpers para crear notificaciones desde server actions.
 * Todas las funciones son no-op silencioso cuando no aplica
 * (ej. self-notify, missing assignee, etc.) — para que las puedas
 * llamar sin if checks complicados en el call-site.
 *
 * Cada notificación crea (1) registro en DB para mostrar en el bell,
 * (2) push notification al OS si el usuario tiene subscriptions registradas.
 */

export async function notifyAssigned(opts: {
  taskId: string;
  taskTitle: string;
  assigneeId: string | null;
  fromUserId: string;
}) {
  if (!opts.assigneeId) return;
  if (opts.assigneeId === opts.fromUserId) return; // no self-notify

  const fromUser = await prisma.user.findUnique({
    where: { id: opts.fromUserId },
    select: { handle: true },
  });

  const message = `@${fromUser?.handle ?? "alguien"} te asignó: "${opts.taskTitle}"`;

  await prisma.notification.create({
    data: {
      userId: opts.assigneeId,
      kind: "task_assigned",
      message,
      taskId: opts.taskId,
      fromUserId: opts.fromUserId,
    },
  });

  // Fire-and-forget push (no bloqueante)
  sendPushToUser(opts.assigneeId, {
    title: "Nueva tarea asignada",
    body: message,
    url: `/task/${opts.taskId}`,
    tag: `task-${opts.taskId}`,
  }).catch(() => {});
}

export async function notifyTransferredFromMe(opts: {
  taskId: string;
  taskTitle: string;
  fromAssigneeId: string;
  toAssigneeId: string;
  byUserId: string;
}) {
  if (opts.fromAssigneeId === opts.byUserId) return;

  const toUser = await prisma.user.findUnique({
    where: { id: opts.toAssigneeId },
    select: { handle: true },
  });

  const message = `Tu tarea "${opts.taskTitle}" se transfirió a @${toUser?.handle ?? "alguien"}`;

  await prisma.notification.create({
    data: {
      userId: opts.fromAssigneeId,
      kind: "task_transferred_from_me",
      message,
      taskId: opts.taskId,
      fromUserId: opts.byUserId,
    },
  });

  sendPushToUser(opts.fromAssigneeId, {
    title: "Tarea transferida",
    body: message,
    url: `/task/${opts.taskId}`,
    tag: `task-${opts.taskId}`,
  }).catch(() => {});
}

/* ----------------------- Review notifications ----------------------- */

export async function notifyReviewRequested(opts: {
  taskId: string;
  taskTitle: string;
  reviewerId: string;
  reviewerIsClient: boolean;
  fromUserId: string;
}) {
  if (opts.reviewerId === opts.fromUserId) return;

  const fromUser = await prisma.user.findUnique({
    where: { id: opts.fromUserId },
    select: { handle: true },
  });

  const clientHint = opts.reviewerIsClient ? " (revisión cliente)" : "";
  const message = `@${fromUser?.handle ?? "alguien"} pide tu revisión en "${opts.taskTitle}"${clientHint}`;

  await prisma.notification.create({
    data: {
      userId: opts.reviewerId,
      kind: "task_review_requested",
      message,
      taskId: opts.taskId,
      fromUserId: opts.fromUserId,
    },
  });

  sendPushToUser(opts.reviewerId, {
    title: "Pendiente de revisión",
    body: message,
    url: `/task/${opts.taskId}`,
    tag: `task-${opts.taskId}`,
  }).catch(() => {});
}

export async function notifyReviewApproved(opts: {
  taskId: string;
  taskTitle: string;
  assigneeId: string | null;
  fromUserId: string;
}) {
  if (!opts.assigneeId) return;
  if (opts.assigneeId === opts.fromUserId) return;

  const fromUser = await prisma.user.findUnique({
    where: { id: opts.fromUserId },
    select: { handle: true },
  });

  const message = `@${fromUser?.handle ?? "alguien"} aprobó tu tarea "${opts.taskTitle}"`;

  await prisma.notification.create({
    data: {
      userId: opts.assigneeId,
      kind: "task_review_approved",
      message,
      taskId: opts.taskId,
      fromUserId: opts.fromUserId,
    },
  });

  sendPushToUser(opts.assigneeId, {
    title: "Tarea aprobada",
    body: message,
    url: `/task/${opts.taskId}`,
    tag: `task-${opts.taskId}`,
  }).catch(() => {});
}

export async function notifyReviewReturned(opts: {
  taskId: string;
  taskTitle: string;
  assigneeId: string | null;
  fromUserId: string;
  reason: string | null;
}) {
  if (!opts.assigneeId) return;
  if (opts.assigneeId === opts.fromUserId) return;

  const fromUser = await prisma.user.findUnique({
    where: { id: opts.fromUserId },
    select: { handle: true },
  });

  const reasonHint = opts.reason ? ` — "${opts.reason}"` : "";
  const message = `@${fromUser?.handle ?? "alguien"} devolvió "${opts.taskTitle}"${reasonHint}`;

  await prisma.notification.create({
    data: {
      userId: opts.assigneeId,
      kind: "task_review_returned",
      message,
      taskId: opts.taskId,
      fromUserId: opts.fromUserId,
    },
  });

  sendPushToUser(opts.assigneeId, {
    title: "Revisión devuelta",
    body: message,
    url: `/task/${opts.taskId}`,
    tag: `task-${opts.taskId}`,
  }).catch(() => {});
}

export async function notifyCommented(opts: {
  taskId: string;
  taskTitle: string;
  taskAssigneeId: string | null;
  fromUserId: string;
}) {
  if (!opts.taskAssigneeId) return;
  if (opts.taskAssigneeId === opts.fromUserId) return;

  const fromUser = await prisma.user.findUnique({
    where: { id: opts.fromUserId },
    select: { handle: true },
  });

  const message = `@${fromUser?.handle ?? "alguien"} comentó en "${opts.taskTitle}"`;

  await prisma.notification.create({
    data: {
      userId: opts.taskAssigneeId,
      kind: "task_commented",
      message,
      taskId: opts.taskId,
      fromUserId: opts.fromUserId,
    },
  });

  sendPushToUser(opts.taskAssigneeId, {
    title: "Nuevo comentario",
    body: message,
    url: `/task/${opts.taskId}`,
    tag: `task-${opts.taskId}`,
  }).catch(() => {});
}
