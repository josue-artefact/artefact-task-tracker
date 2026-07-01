"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, requirePM } from "@/lib/auth";

/* --------------------------- Create pipeline --------------------------- */

/**
 * Crea un pipeline con sus tareas iniciales en una sola transacción.
 *
 * Form fields esperados:
 *   name, description, clientId, startDate, savedAsTemplate?
 *   task[N][title], task[N][teamId], task[N][assigneeId]?, task[N][priority],
 *     task[N][dueOffsetDays]?, task[N][estimatedMinutes]?,
 *     task[N][blockedByOrder]?  (orden de la predecesora dentro del pipeline)
 *
 * dueOffsetDays se suma a startDate para calcular la dueDate de cada tarea.
 * blockedByOrder referencia el `pipelineOrder` de otra tarea del mismo pipeline.
 */
export async function createPipeline(formData: FormData) {
  const pm = await requirePM();

  const name = ((formData.get("name") as string) || "").trim();
  const description = ((formData.get("description") as string) || "").trim() || null;
  const clientId = formData.get("clientId") as string;
  const startDateRaw = formData.get("startDate") as string;
  const savedAsTemplate = formData.get("savedAsTemplate") === "on";

  if (!name || !clientId || !startDateRaw) {
    redirect("/admin/pipelines/new?error=missing_fields");
  }

  const startDate = new Date(startDateRaw);
  if (isNaN(startDate.getTime())) {
    redirect("/admin/pipelines/new?error=bad_date");
  }

  // Recolectar tareas del form. Convención: task[0][field], task[1][field], ...
  // Iteramos por índice hasta no encontrar título.
  type DraftTask = {
    title: string;
    teamId: string;
    assigneeId: string | null;
    priority: string;
    dueOffsetDays: number;
    estimatedMinutes: number | null;
    blockedByOrder: number | null;
  };

  const draftTasks: DraftTask[] = [];
  let i = 0;
  while (true) {
    const title = formData.get(`task[${i}][title]`) as string | null;
    if (!title || !title.trim()) break;

    const teamId = (formData.get(`task[${i}][teamId]`) as string) || "";
    if (!teamId) {
      i++;
      continue;
    }

    draftTasks.push({
      title: title.trim(),
      teamId,
      assigneeId: ((formData.get(`task[${i}][assigneeId]`) as string) || "") || null,
      priority: (formData.get(`task[${i}][priority]`) as string) || "MEDIUM",
      dueOffsetDays: parseInt((formData.get(`task[${i}][dueOffsetDays]`) as string) || "0", 10) || 0,
      estimatedMinutes: parseInt((formData.get(`task[${i}][estimatedMinutes]`) as string) || "0", 10) || null,
      blockedByOrder: (() => {
        const v = (formData.get(`task[${i}][blockedByOrder]`) as string) || "";
        const n = parseInt(v, 10);
        return Number.isFinite(n) && n > 0 ? n : null;
      })(),
    });
    i++;
  }

  if (draftTasks.length === 0) {
    redirect("/admin/pipelines/new?error=no_tasks");
  }

  // Creamos pipeline + tasks en transacción. Necesitamos crear primero las tasks
  // sin blockedByTaskId (porque referencia IDs que aún no existen), luego un
  // segundo paso para resolver dependencias.
  const created = await prisma.$transaction(async (tx) => {
    const pipeline = await tx.pipeline.create({
      data: {
        name,
        description,
        clientId,
        startDate,
        savedAsTemplate,
        createdById: pm.id,
      },
    });

    // Crear tareas con su pipelineOrder (1-indexed)
    const taskIds: string[] = [];
    for (let idx = 0; idx < draftTasks.length; idx++) {
      const dt = draftTasks[idx];
      const order = idx + 1;
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + dt.dueOffsetDays);

      const t = await tx.task.create({
        data: {
          title: dt.title,
          clientId,
          teamId: dt.teamId,
          assigneeId: dt.assigneeId,
          priority: dt.priority,
          estimatedMinutes: dt.estimatedMinutes && dt.estimatedMinutes > 0 ? dt.estimatedMinutes : null,
          dueDate,
          createdById: pm.id,
          pipelineId: pipeline.id,
          pipelineOrder: order,
        },
      });
      taskIds.push(t.id);
    }

    // Segundo paso: resolver blockedBy (referencias por orden del form → IDs reales)
    for (let idx = 0; idx < draftTasks.length; idx++) {
      const dt = draftTasks[idx];
      if (dt.blockedByOrder && dt.blockedByOrder >= 1 && dt.blockedByOrder <= draftTasks.length) {
        await tx.task.update({
          where: { id: taskIds[idx] },
          data: { blockedByTaskId: taskIds[dt.blockedByOrder - 1] },
        });
      }
    }

    return pipeline;
  });

  revalidatePath("/admin/pipelines");
  revalidatePath("/admin");
  redirect(`/pipeline/${created.id}`);
}

/* --------------------------- Duplicate pipeline --------------------------- */

/**
 * Clona un pipeline existente (template o no), opcionalmente con nueva startDate.
 * Las dueDates se recalculan en base al offset original.
 */
export async function duplicatePipeline(formData: FormData) {
  const pm = await requirePM();
  const sourceId = formData.get("sourceId") as string;
  const newName = ((formData.get("name") as string) || "").trim();
  const startDateRaw = formData.get("startDate") as string;

  if (!sourceId || !newName || !startDateRaw) return;
  const newStart = new Date(startDateRaw);
  if (isNaN(newStart.getTime())) return;

  const source = await prisma.pipeline.findUnique({
    where: { id: sourceId },
    include: { tasks: { orderBy: { pipelineOrder: "asc" } } },
  });
  if (!source) return;

  const created = await prisma.$transaction(async (tx) => {
    const newPipeline = await tx.pipeline.create({
      data: {
        name: newName,
        description: source.description,
        clientId: source.clientId,
        startDate: newStart,
        templateOfId: source.id,
        createdById: pm.id,
      },
    });

    // Crear tareas con dueDates recalculadas
    const oldToNewId = new Map<string, string>();
    for (const t of source.tasks) {
      // Calcular offset original (días entre source.startDate y t.dueDate)
      let dueDate: Date | null = null;
      if (t.dueDate) {
        const offset = Math.round(
          (t.dueDate.getTime() - source.startDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        dueDate = new Date(newStart);
        dueDate.setDate(dueDate.getDate() + offset);
      }

      const created = await tx.task.create({
        data: {
          title: t.title,
          description: t.description,
          clientId: t.clientId,
          teamId: t.teamId,
          assigneeId: t.assigneeId,
          priority: t.priority,
          estimatedMinutes: t.estimatedMinutes,
          dueDate,
          createdById: pm.id,
          pipelineId: newPipeline.id,
          pipelineOrder: t.pipelineOrder,
        },
      });
      oldToNewId.set(t.id, created.id);
    }

    // Resolver dependencias usando el mapeo old → new
    for (const t of source.tasks) {
      if (t.blockedByTaskId) {
        const newId = oldToNewId.get(t.id);
        const newPredId = oldToNewId.get(t.blockedByTaskId);
        if (newId && newPredId) {
          await tx.task.update({ where: { id: newId }, data: { blockedByTaskId: newPredId } });
        }
      }
    }

    return newPipeline;
  });

  revalidatePath("/admin/pipelines");
  redirect(`/pipeline/${created.id}`);
}

/* --------------------------- Update pipeline --------------------------- */

export async function updatePipeline(formData: FormData) {
  await requirePM();
  const id = formData.get("id") as string;
  const name = ((formData.get("name") as string) || "").trim();
  const description = ((formData.get("description") as string) || "").trim() || null;
  const status = (formData.get("status") as string) || "ACTIVE";
  const savedAsTemplate = formData.get("savedAsTemplate") === "on";

  if (!id || !name) return;
  if (!["ACTIVE", "DONE", "PAUSED", "ARCHIVED"].includes(status)) return;

  await prisma.pipeline.update({
    where: { id },
    data: { name, description, status, savedAsTemplate },
  });
  revalidatePath(`/pipeline/${id}`);
  revalidatePath("/admin/pipelines");
}

/* --------------------------- Archive / Unarchive pipeline --------------------------- */

/**
 * Archiva un pipeline — lo pasa a status "ARCHIVED", sacándolo de la lista
 * de activos. Las tareas asociadas se mantienen intactas (mayoría estarán
 * DONE) para preservar historial e insights.
 *
 * A diferencia de deletePipeline, es reversible vía unarchivePipeline.
 */
export async function archivePipeline(formData: FormData) {
  await requirePM();
  const id = formData.get("id") as string;
  if (!id) return;

  await prisma.pipeline.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });
  revalidatePath(`/pipeline/${id}`);
  revalidatePath("/admin/pipelines");
  revalidatePath("/admin");
}

/**
 * Desarchiva un pipeline — vuelve a status "DONE" (el estado "post-archivo"
 * natural). Si el PM quiere reactivarlo del todo, puede editar el status a
 * ACTIVE desde "Editar".
 */
export async function unarchivePipeline(formData: FormData) {
  await requirePM();
  const id = formData.get("id") as string;
  if (!id) return;

  await prisma.pipeline.updateMany({
    where: { id, status: "ARCHIVED" },
    data: { status: "DONE" },
  });
  revalidatePath(`/pipeline/${id}`);
  revalidatePath("/admin/pipelines");
  revalidatePath("/admin");
}

/* --------------------------- Delete pipeline --------------------------- */

/**
 * Borra un pipeline y **todas sus tareas en cascada**.
 *
 * Decisión de diseño: cuando un PM borra un pipeline, su expectativa es que
 * se borre el pipeline + su contenido. La versión anterior usaba el onDelete:
 * SetNull del schema, lo que dejaba las tareas huérfanas en los inboxes de
 * los asignees como "zombies" (bug reportado por @nolita, 2026-05-20).
 *
 * Ahora la transacción borra explícitamente:
 *   1. timeEntries de esas tareas (cascade en schema, pero explícito por claridad)
 *   2. las tareas asociadas al pipeline
 *   3. el pipeline mismo
 *
 * Si en el futuro algún caso requiere "borrar pipeline conservando tareas
 * sueltas", se debe agregar como acción separada y opt-in explícito, NO como
 * comportamiento default.
 */
export async function deletePipeline(formData: FormData) {
  await requirePM();
  const id = formData.get("id") as string;
  if (!id) return;

  await prisma.$transaction([
    // task.deleteMany lleva en cascade sus timeEntries, comments, transfers,
    // notifications (todos onDelete:Cascade en el schema)
    prisma.task.deleteMany({ where: { pipelineId: id } }),
    prisma.pipeline.delete({ where: { id } }),
  ]);

  revalidatePath("/admin/pipelines");
  revalidatePath("/admin");
  revalidatePath("/inbox");
  redirect("/admin/pipelines");
}

/* --------------------------- Add task to existing pipeline --------------------------- */

/**
 * Agrega una tarea nueva al final de un pipeline existente (pipelineOrder =
 * max + 1). Heredamos el clientId del pipeline para garantizar consistencia.
 *
 * Form fields:
 *   pipelineId, title, teamId, assigneeId?, priority?, dueDate?,
 *   estimatedMinutes?, blockedByTaskId? (opcional, FK directa)
 */
export async function addTaskToPipeline(formData: FormData) {
  const pm = await requirePM();

  const pipelineId = formData.get("pipelineId") as string;
  const title = ((formData.get("title") as string) || "").trim();
  const teamId = formData.get("teamId") as string;
  if (!pipelineId || !title || !teamId) return;

  const pipeline = await prisma.pipeline.findUnique({
    where: { id: pipelineId },
    select: { clientId: true },
  });
  if (!pipeline) return;

  const assigneeId = ((formData.get("assigneeId") as string) || "") || null;
  const priority = (formData.get("priority") as string) || "MEDIUM";
  const dueDateRaw = (formData.get("dueDate") as string) || "";
  const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;
  const blockedByTaskId = ((formData.get("blockedByTaskId") as string) || "") || null;
  const estimateRaw = ((formData.get("estimatedMinutes") as string) || "").trim();
  const estimatedMinutes = estimateRaw ? parseInt(estimateRaw, 10) : null;

  // pipelineOrder = max + 1 dentro del pipeline
  const maxOrder = await prisma.task.aggregate({
    where: { pipelineId },
    _max: { pipelineOrder: true },
  });
  const nextOrder = (maxOrder._max.pipelineOrder ?? 0) + 1;

  await prisma.task.create({
    data: {
      title,
      clientId: pipeline.clientId,
      teamId,
      assigneeId,
      priority,
      dueDate,
      estimatedMinutes: estimatedMinutes && estimatedMinutes > 0 ? estimatedMinutes : null,
      createdById: pm.id,
      pipelineId,
      pipelineOrder: nextOrder,
      blockedByTaskId,
    },
  });

  revalidatePath(`/pipeline/${pipelineId}`);
  revalidatePath("/admin/pipelines");
  revalidatePath("/inbox");
}

/* --------------------------- Reorder pipeline task --------------------------- */

/**
 * Intercambia el pipelineOrder de una tarea con su vecina (arriba o abajo).
 * Idempotente: si no hay vecina en la dirección pedida (ya está en el extremo),
 * no hace nada.
 */
export async function reorderPipelineTask(formData: FormData) {
  await requirePM();
  const taskId = formData.get("taskId") as string;
  const direction = formData.get("direction") as "up" | "down";
  if (!taskId || (direction !== "up" && direction !== "down")) return;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, pipelineId: true, pipelineOrder: true },
  });
  if (!task?.pipelineId || task.pipelineOrder == null) return;

  // Buscar vecina:
  //   up   = pipelineOrder más cercano por debajo (orden menor)
  //   down = pipelineOrder más cercano por arriba (orden mayor)
  const neighbor = await prisma.task.findFirst({
    where: {
      pipelineId: task.pipelineId,
      pipelineOrder: direction === "up"
        ? { lt: task.pipelineOrder }
        : { gt: task.pipelineOrder },
    },
    orderBy: { pipelineOrder: direction === "up" ? "desc" : "asc" },
    select: { id: true, pipelineOrder: true },
  });
  if (!neighbor?.pipelineOrder) return;

  // Swap en transacción. Usamos un sentinela temporal porque hay índice único
  // (no estrictamente, pero por buenas prácticas) y para no chocar si hubiera.
  // Como pipelineOrder no es unique en el schema, podemos hacer un swap directo.
  await prisma.$transaction([
    prisma.task.update({ where: { id: task.id }, data: { pipelineOrder: neighbor.pipelineOrder } }),
    prisma.task.update({ where: { id: neighbor.id }, data: { pipelineOrder: task.pipelineOrder } }),
  ]);

  revalidatePath(`/pipeline/${task.pipelineId}`);
}

/* --------------------------- Delete pipeline task (con cierre de gaps) --------------------------- */

/**
 * Borra una tarea de un pipeline cerrando el gap de pipelineOrder.
 *
 * Si la tarea tiene timeEntries, comentarios o transferencias, se eliminan en
 * cascade (mismo comportamiento que deleteTask). Las tareas posteriores se
 * re-numeran -1 para mantener la secuencia limpia (#1, #2, #3 sin huecos).
 *
 * Si la tarea NO pertenece a un pipeline, esto se delega a deleteTask normal.
 */
export async function deletePipelineTask(formData: FormData) {
  await requirePM();
  const taskId = formData.get("taskId") as string;
  if (!taskId) return;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, pipelineId: true, pipelineOrder: true },
  });
  if (!task) return;

  if (!task.pipelineId || task.pipelineOrder == null) {
    // Tarea suelta — borrar normal sin tocar orden
    await prisma.task.delete({ where: { id: taskId } });
    revalidatePath("/admin");
    revalidatePath("/inbox");
    return;
  }

  // En pipeline: borrar + re-numerar las posteriores
  const removedOrder = task.pipelineOrder;
  const pipelineId = task.pipelineId;

  await prisma.$transaction(async (tx) => {
    await tx.task.delete({ where: { id: taskId } });
    await tx.task.updateMany({
      where: { pipelineId, pipelineOrder: { gt: removedOrder } },
      data: { pipelineOrder: { decrement: 1 } },
    });
  });

  revalidatePath(`/pipeline/${pipelineId}`);
  revalidatePath("/admin/pipelines");
  revalidatePath("/inbox");
}

/* --------------------------- Client blocker toggle --------------------------- */

export async function toggleClientBlocker(formData: FormData) {
  const user = await requireUser();
  const taskId = formData.get("taskId") as string;
  if (!taskId) return;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  // PM siempre puede; assignee también
  const canEdit = user.role === "PM" || task.assigneeId === user.id;
  if (!canEdit) return;

  const willBlock = !task.blockedByClient;
  await prisma.task.update({
    where: { id: taskId },
    data: {
      blockedByClient: willBlock,
      blockedSince: willBlock ? new Date() : null,
      lastClientReminderAt: willBlock ? task.lastClientReminderAt : null,
    },
  });
  if (task.pipelineId) revalidatePath(`/pipeline/${task.pipelineId}`);
  revalidatePath(`/task/${taskId}`);
  revalidatePath("/admin/pipelines");
}

/** Marca que se envió un recordatorio al cliente (timestamp). */
export async function markClientReminderSent(formData: FormData) {
  const user = await requireUser();
  const taskId = formData.get("taskId") as string;
  if (!taskId) return;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return;
  const canEdit = user.role === "PM" || task.assigneeId === user.id;
  if (!canEdit) return;

  await prisma.task.update({
    where: { id: taskId },
    data: { lastClientReminderAt: new Date() },
  });
  if (task.pipelineId) revalidatePath(`/pipeline/${task.pipelineId}`);
  revalidatePath(`/task/${taskId}`);
}
