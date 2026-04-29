"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, requirePM } from "@/lib/auth";
import { parseDuration, dateInputToDate, startOfToday } from "@/lib/time";

const DAY_CAP_MIN = 16 * 60; // 960 min — anything more is clearly fake
const RETRO_DAYS = 14;       // máximo de días para atrás
const EDIT_LOCK_MS = 24 * 60 * 60 * 1000; // 24 h

/**
 * Maneja errores de validación devolviéndolos como query params al detalle de tarea.
 * Usar redirect() en server actions porque devolver un objeto se complica con form actions.
 */
function fail(taskId: string, code: string): never {
  redirect(`/task/${taskId}?time_error=${code}`);
}

/* ------------------------ Log time ------------------------ */

export async function logTime(formData: FormData) {
  const user = await requireUser();
  const taskId = formData.get("taskId") as string;
  if (!taskId) return;

  const durRaw = (formData.get("duration") as string) || "";
  const noteRaw = ((formData.get("note") as string) || "").trim();
  const dateRaw = (formData.get("loggedFor") as string) || "";

  const minutes = parseDuration(durRaw);
  if (!minutes || minutes <= 0) fail(taskId, "bad_duration");
  if (minutes! > DAY_CAP_MIN) fail(taskId, "too_long");

  const today = startOfToday();
  const loggedFor = dateRaw ? dateInputToDate(dateRaw) : today;
  if (!loggedFor) fail(taskId, "bad_date");

  // Bloquear futuro
  if (loggedFor!.getTime() > today.getTime()) fail(taskId, "future_date");

  // Bloquear retroactivo > 14 días
  const earliest = new Date(today);
  earliest.setDate(earliest.getDate() - RETRO_DAYS);
  if (loggedFor!.getTime() < earliest.getTime()) fail(taskId, "too_old");

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) fail(taskId, "no_task");

  // Bloquear log en tareas DONE para miembros (PM puede)
  if (task!.status === "DONE" && user.role !== "PM") fail(taskId, "task_done");

  // Cap por día por usuario
  const dayStart = new Date(loggedFor!);
  const dayEnd = new Date(loggedFor!);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const existing = await prisma.timeEntry.aggregate({
    where: {
      userId: user.id,
      deletedAt: null,
      loggedFor: { gte: dayStart, lt: dayEnd },
    },
    _sum: { minutes: true },
  });
  const todayTotal = existing._sum.minutes ?? 0;
  if (todayTotal + minutes! > DAY_CAP_MIN) fail(taskId, "day_cap");

  await prisma.timeEntry.create({
    data: {
      taskId,
      userId: user.id,
      minutes: minutes!,
      note: noteRaw || null,
      loggedFor: loggedFor!,
    },
  });

  revalidatePath(`/task/${taskId}`);
  revalidatePath("/admin/insights");
  revalidatePath("/inbox");
}

/* ------------------------ Update time entry ------------------------ */

export async function updateTimeEntry(formData: FormData) {
  const user = await requireUser();
  const id = formData.get("id") as string;
  if (!id) return;

  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry || entry.deletedAt) return;

  // Permission: PM siempre, owner si dentro de 24h
  const isOwner = entry.userId === user.id;
  const isLocked = Date.now() - entry.createdAt.getTime() > EDIT_LOCK_MS;
  const canEdit = user.role === "PM" || (isOwner && !isLocked);
  if (!canEdit) fail(entry.taskId, isOwner ? "locked" : "not_yours");

  const durRaw = (formData.get("duration") as string) || "";
  const noteRaw = ((formData.get("note") as string) || "").trim();
  const dateRaw = (formData.get("loggedFor") as string) || "";

  const minutes = parseDuration(durRaw);
  if (!minutes || minutes <= 0) fail(entry.taskId, "bad_duration");
  if (minutes! > DAY_CAP_MIN) fail(entry.taskId, "too_long");

  const today = startOfToday();
  const newLoggedFor = dateRaw ? dateInputToDate(dateRaw) : entry.loggedFor;
  if (!newLoggedFor) fail(entry.taskId, "bad_date");
  if (newLoggedFor!.getTime() > today.getTime()) fail(entry.taskId, "future_date");

  const earliest = new Date(today);
  earliest.setDate(earliest.getDate() - RETRO_DAYS);
  // PM puede pisar el límite retroactivo (ej. corrección histórica)
  if (user.role !== "PM" && newLoggedFor!.getTime() < earliest.getTime()) {
    fail(entry.taskId, "too_old");
  }

  await prisma.$transaction([
    prisma.timeEntryEdit.create({
      data: {
        entryId: entry.id,
        editorId: user.id,
        action: "edit",
        prevMinutes: entry.minutes,
        prevNote: entry.note,
        prevLoggedFor: entry.loggedFor,
        newMinutes: minutes,
        newNote: noteRaw || null,
        newLoggedFor: newLoggedFor,
      },
    }),
    prisma.timeEntry.update({
      where: { id },
      data: { minutes, note: noteRaw || null, loggedFor: newLoggedFor! },
    }),
  ]);

  revalidatePath(`/task/${entry.taskId}`);
  revalidatePath("/admin/insights");
}

/* ------------------------ Delete time entry (soft) ------------------------ */

export async function deleteTimeEntry(formData: FormData) {
  const user = await requireUser();
  const id = formData.get("id") as string;
  if (!id) return;

  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry || entry.deletedAt) return;

  const isOwner = entry.userId === user.id;
  const isLocked = Date.now() - entry.createdAt.getTime() > EDIT_LOCK_MS;
  const canDelete = user.role === "PM" || (isOwner && !isLocked);
  if (!canDelete) fail(entry.taskId, isOwner ? "locked" : "not_yours");

  await prisma.$transaction([
    prisma.timeEntryEdit.create({
      data: {
        entryId: entry.id,
        editorId: user.id,
        action: "delete",
        prevMinutes: entry.minutes,
        prevNote: entry.note,
        prevLoggedFor: entry.loggedFor,
      },
    }),
    prisma.timeEntry.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),
  ]);

  revalidatePath(`/task/${entry.taskId}`);
  revalidatePath("/admin/insights");
}

/* ------------------------ Set task estimate (PM only) ------------------------ */

export async function setTaskEstimate(formData: FormData) {
  await requirePM();
  const id = formData.get("taskId") as string;
  const durRaw = ((formData.get("estimate") as string) || "").trim();

  if (!id) return;

  if (!durRaw) {
    // Permitir limpiar el estimate
    await prisma.task.update({ where: { id }, data: { estimatedMinutes: null } });
  } else {
    const minutes = parseDuration(durRaw);
    if (!minutes || minutes <= 0) fail(id, "bad_estimate");
    await prisma.task.update({ where: { id }, data: { estimatedMinutes: minutes } });
  }

  revalidatePath(`/task/${id}`);
  revalidatePath("/admin");
  revalidatePath("/admin/insights");
}
