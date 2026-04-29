"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, requirePM } from "@/lib/auth";
import { PRIORITIES, STATUSES } from "@/lib/format";
import { parseDuration } from "@/lib/time";

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

  await prisma.task.create({
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

  // Member can only update their own task; PM can update anything.
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return;
  if (user.role !== "PM" && task.assigneeId !== user.id) return;

  await prisma.task.update({ where: { id }, data: { status } });
  revalidatePath("/admin");
  revalidatePath("/inbox");
  revalidatePath(`/task/${id}`);
}

export async function addComment(formData: FormData) {
  const user = await requireUser();
  const taskId = formData.get("taskId") as string;
  const body = ((formData.get("body") as string) || "").trim();
  if (!taskId || !body) return;
  await prisma.comment.create({ data: { taskId, body, authorId: user.id } });
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

  revalidatePath("/admin");
  revalidatePath("/inbox");
  revalidatePath(`/task/${taskId}`);
}
