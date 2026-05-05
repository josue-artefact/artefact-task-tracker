import { prisma } from "./db";

/**
 * Helpers para crear notificaciones desde server actions.
 * Todas las funciones son no-op silencioso cuando no aplica
 * (ej. self-notify, missing assignee, etc.) — para que las puedas
 * llamar sin if checks complicados en el call-site.
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

  await prisma.notification.create({
    data: {
      userId: opts.assigneeId,
      kind: "task_assigned",
      message: `@${fromUser?.handle ?? "alguien"} te asignó: "${opts.taskTitle}"`,
      taskId: opts.taskId,
      fromUserId: opts.fromUserId,
    },
  });
}

export async function notifyTransferredFromMe(opts: {
  taskId: string;
  taskTitle: string;
  fromAssigneeId: string;
  toAssigneeId: string;
  byUserId: string;
}) {
  if (opts.fromAssigneeId === opts.byUserId) return; // si yo mismo me la pasé, no me notifico

  const toUser = await prisma.user.findUnique({
    where: { id: opts.toAssigneeId },
    select: { handle: true },
  });

  await prisma.notification.create({
    data: {
      userId: opts.fromAssigneeId,
      kind: "task_transferred_from_me",
      message: `Tu tarea "${opts.taskTitle}" se transfirió a @${toUser?.handle ?? "alguien"}`,
      taskId: opts.taskId,
      fromUserId: opts.byUserId,
    },
  });
}

export async function notifyCommented(opts: {
  taskId: string;
  taskTitle: string;
  taskAssigneeId: string | null;
  fromUserId: string;
}) {
  if (!opts.taskAssigneeId) return;
  if (opts.taskAssigneeId === opts.fromUserId) return; // no self-notify

  const fromUser = await prisma.user.findUnique({
    where: { id: opts.fromUserId },
    select: { handle: true },
  });

  await prisma.notification.create({
    data: {
      userId: opts.taskAssigneeId,
      kind: "task_commented",
      message: `@${fromUser?.handle ?? "alguien"} comentó en "${opts.taskTitle}"`,
      taskId: opts.taskId,
      fromUserId: opts.fromUserId,
    },
  });
}
