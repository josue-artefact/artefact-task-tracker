import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { PriorityPill, StatusPill } from "@/components/PriorityPill";
import { formatDate, formatRelative } from "@/lib/format";
import {
  getPipelineHealth,
  getPipelineProgress,
  getTaskRisk,
  healthDot,
  healthLabel,
  taskRiskLabel,
  taskRiskTone,
} from "@/lib/pipeline";
import { duplicatePipeline, updatePipeline, deletePipeline, toggleClientBlocker, markClientReminderSent } from "@/app/actions/pipeline";
import { EditCard, EditTrigger, EditPanel } from "@/components/EditDisclosure";

export const dynamic = "force-dynamic";

export default async function PipelineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const isPM = user.role === "PM";

  const pipeline = await prisma.pipeline.findUnique({
    where: { id },
    include: {
      client: true,
      createdBy: true,
      tasks: {
        include: {
          assignee: true,
          team: true,
          blockedByTask: { select: { id: true, title: true, pipelineOrder: true } },
        },
        orderBy: { pipelineOrder: "asc" },
      },
    },
  });

  if (!pipeline) return notFound();

  const today = new Date().toISOString().slice(0, 10);
  const health = getPipelineHealth(pipeline.tasks);
  const progress = getPipelineProgress(pipeline.tasks);
  const totalTasks = pipeline.tasks.length;
  const doneTasks = pipeline.tasks.filter((t) => t.status === "DONE").length;

  // Para resolver risk, necesito una referencia simplificada de todas las tareas
  const taskRefs = pipeline.tasks.map((t) => ({
    id: t.id,
    status: t.status,
    dueDate: t.dueDate,
    blockedByTaskId: t.blockedByTaskId,
    blockedByClient: t.blockedByClient,
    blockedSince: t.blockedSince,
  }));

  return (
    <AppShell user={user}>
      {/* Eyebrow */}
      <div className="mb-6 flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-ink-500">
        <Link href="/admin/pipelines" className="inline-flex items-center gap-2 hover:text-ink-900">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          Pipelines
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-ink-900 px-2 py-0.5 text-cream-50">{pipeline.client.name}</span>
          <span className="opacity-30">·</span>
          <span>arranca {formatDate(pipeline.startDate)}</span>
        </div>
      </div>

      {/* Header */}
      <header className="mb-8 flex flex-wrap items-end justify-between gap-6 animate-fade-up">
        <div className="min-w-0">
          <h1 className="font-serif italic text-[clamp(36px,5vw,60px)] leading-[1] tracking-tightest text-ink-900">
            {pipeline.name}
          </h1>
          {pipeline.description && (
            <p className="mt-3 max-w-2xl text-[14px] text-ink-600">{pipeline.description}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-full bg-ink-900/[0.04] px-3 py-1.5 ring-1 ring-ink-900/5">
              <span className={`h-2 w-2 rounded-full ${healthDot(health)}`} />
              <span className="text-[10px] uppercase tracking-[0.18em] text-ink-700">{healthLabel(health)}</span>
            </div>
            <span className="rounded-full bg-ink-900/[0.04] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-700 ring-1 ring-ink-900/5">
              {doneTasks} / {totalTasks} tareas · {progress}%
            </span>
            {pipeline.savedAsTemplate && (
              <span className="rounded-full bg-amber-100 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-amber-900 ring-1 ring-amber-300/30">
                Template
              </span>
            )}
            {pipeline.status !== "ACTIVE" && (
              <span className="rounded-full bg-ink-900/[0.04] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-700 ring-1 ring-ink-900/5">
                {pipeline.status === "DONE" ? "Cerrado" : pipeline.status === "PAUSED" ? "Pausado" : "Archivado"}
              </span>
            )}
          </div>
        </div>

        {/* Actions PM */}
        {isPM && (
          <div className="flex shrink-0 flex-wrap items-start gap-2">
            <EditCard>
              <EditTrigger label="Duplicar" />
              <EditPanel className="absolute right-0 mt-2 w-80 rounded-2xl bg-cream-50 p-4 shadow-[0_10px_40px_rgba(10,9,7,0.1)] ring-1 ring-ink-900/10 z-20">
                <form action={duplicatePipeline} className="space-y-2">
                  <input type="hidden" name="sourceId" value={pipeline.id} />
                  <SmallLabel>Nombre del nuevo pipeline</SmallLabel>
                  <SmallInput name="name" required defaultValue={`${pipeline.name} — copia`} />
                  <SmallLabel>Fecha de arranque</SmallLabel>
                  <SmallInput type="date" name="startDate" required defaultValue={today} />
                  <p className="text-[10px] text-ink-500">Las dueDates se ajustan al nuevo arranque manteniendo los offsets originales.</p>
                  <div className="flex justify-end pt-1">
                    <SmallSubmit>Crear copia</SmallSubmit>
                  </div>
                </form>
              </EditPanel>
            </EditCard>

            <EditCard>
              <EditTrigger label="Editar" />
              <EditPanel className="absolute right-0 mt-2 w-80 rounded-2xl bg-cream-50 p-4 shadow-[0_10px_40px_rgba(10,9,7,0.1)] ring-1 ring-ink-900/10 z-20">
                <form action={updatePipeline} className="space-y-2">
                  <input type="hidden" name="id" value={pipeline.id} />
                  <SmallLabel>Nombre</SmallLabel>
                  <SmallInput name="name" required defaultValue={pipeline.name} />
                  <SmallLabel>Descripción</SmallLabel>
                  <SmallInput name="description" defaultValue={pipeline.description ?? ""} />
                  <SmallLabel>Estado</SmallLabel>
                  <SmallSelect name="status" defaultValue={pipeline.status}>
                    <option value="ACTIVE">Activo</option>
                    <option value="PAUSED">Pausado</option>
                    <option value="DONE">Cerrado</option>
                    <option value="ARCHIVED">Archivado</option>
                  </SmallSelect>
                  <label className="flex items-center gap-2 pt-1 text-[12px] text-ink-700">
                    <input
                      type="checkbox"
                      name="savedAsTemplate"
                      defaultChecked={pipeline.savedAsTemplate}
                      className="h-3.5 w-3.5 rounded border-ink-900/20 accent-ink-900"
                    />
                    Reusar como template
                  </label>
                  <div className="flex justify-end pt-1">
                    <SmallSubmit>Guardar</SmallSubmit>
                  </div>
                </form>
              </EditPanel>
            </EditCard>

            <form action={deletePipeline}>
              <input type="hidden" name="id" value={pipeline.id} />
              <button
                type="submit"
                className="rounded-full bg-ink-900/[0.04] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-500 ring-1 ring-ink-900/5 transition hover:bg-accent-rust hover:text-cream-50"
              >
                Borrar
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="h-2 w-full overflow-hidden rounded-full bg-ink-900/[0.06]">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              health === "RED" ? "bg-accent-rust" : health === "AMBER" ? "bg-amber-500" : "bg-accent-lime"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Tasks list */}
      <h2 className="mb-3 text-[11px] uppercase tracking-[0.22em] text-ink-500">
        Tareas en orden
      </h2>

      {pipeline.tasks.length === 0 && (
        <div className="rounded-[2rem] bg-ink-900/[0.04] p-1.5 ring-1 ring-ink-900/5">
          <div className="rounded-[calc(2rem-0.375rem)] bg-cream-50 px-8 py-12 text-center text-sm text-ink-400">
            Este pipeline no tiene tareas.
          </div>
        </div>
      )}

      <ol className="space-y-2.5">
        {pipeline.tasks.map((t) => {
          const risk = getTaskRisk(t, taskRefs);
          const tone = taskRiskTone(risk);
          const canToggleBlocker = isPM || t.assigneeId === user.id;
          const blockedDays = t.blockedSince
            ? Math.floor((Date.now() - t.blockedSince.getTime()) / (1000 * 60 * 60 * 24))
            : 0;
          const reminderDays = t.lastClientReminderAt
            ? Math.floor((Date.now() - t.lastClientReminderAt.getTime()) / (1000 * 60 * 60 * 24))
            : null;

          return (
            <li key={t.id}>
              <div className="rounded-[1.5rem] bg-ink-900/[0.04] p-1.5 ring-1 ring-ink-900/5">
                <div className="rounded-[calc(1.5rem-0.375rem)] bg-cream-50 p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-ink-900 px-2 py-0.5 text-[10px] font-medium text-cream-50">
                          #{t.pipelineOrder ?? "—"}
                        </span>
                        <Link
                          href={`/task/${t.id}`}
                          className="font-serif italic text-[20px] text-ink-900 hover:text-ink-700"
                        >
                          {t.title}
                        </Link>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-500">
                        <PriorityPill priority={t.priority} />
                        <StatusPill status={t.status} />
                        {t.dueDate && <span>vence {formatDate(t.dueDate)}</span>}
                        {t.assignee && (
                          <>
                            <span className="opacity-30">·</span>
                            <span className="font-mono">@{t.assignee.handle}</span>
                          </>
                        )}
                        <span className="opacity-30">·</span>
                        <span>{t.team.name}</span>
                      </div>

                      {/* Predecesora */}
                      {t.blockedByTask && (
                        <div className="mt-2 text-[11px] text-ink-500">
                          Depende de:{" "}
                          <Link href={`/task/${t.blockedByTask.id}`} className="text-ink-700 hover:text-ink-900 underline-offset-2 hover:underline">
                            #{t.blockedByTask.pipelineOrder} · {t.blockedByTask.title}
                          </Link>
                        </div>
                      )}

                      {/* Cliente blocker */}
                      {t.blockedByClient && (
                        <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 ring-1 ring-amber-200/40">
                          <div className="text-[11px] text-amber-900">
                            <strong>Esperando aprobación del cliente</strong>
                            {t.blockedSince && ` desde hace ${blockedDays} día${blockedDays === 1 ? "" : "s"}`}
                            {reminderDays !== null && ` · último recordatorio hace ${reminderDays} d`}
                          </div>
                          {canToggleBlocker && (
                            <div className="mt-2 flex gap-2">
                              <form action={markClientReminderSent}>
                                <input type="hidden" name="taskId" value={t.id} />
                                <button type="submit" className="rounded-full bg-amber-200/60 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-amber-900 hover:bg-amber-200">
                                  Marqué recordatorio
                                </button>
                              </form>
                              <form action={toggleClientBlocker}>
                                <input type="hidden" name="taskId" value={t.id} />
                                <button type="submit" className="rounded-full bg-amber-900/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-amber-900 hover:bg-amber-900/20">
                                  Cliente respondió
                                </button>
                              </form>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Risk + actions */}
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${tone.bg} ${tone.text}`}
                      >
                        {taskRiskLabel(risk)}
                      </span>
                      {canToggleBlocker && !t.blockedByClient && t.status !== "DONE" && (
                        <form action={toggleClientBlocker}>
                          <input type="hidden" name="taskId" value={t.id} />
                          <button
                            type="submit"
                            className="rounded-full bg-ink-900/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-ink-600 ring-1 ring-ink-900/5 transition hover:bg-amber-100 hover:text-amber-900"
                          >
                            Esperar cliente
                          </button>
                        </form>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 text-[10px] uppercase tracking-[0.18em] text-ink-400">
                    actualizada {formatRelative(t.updatedAt)}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </AppShell>
  );
}

/* ---------------- helpers ---------------- */

function SmallLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500">{children}</div>;
}
function SmallInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-lg bg-ink-900/[0.04] px-2 py-1.5 text-[12px] text-ink-900 ring-1 ring-ink-900/5 focus:bg-ink-900/[0.06] focus:outline-none focus:ring-ink-900/20"
    />
  );
}
function SmallSelect({ children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className="w-full rounded-lg bg-ink-900/[0.04] px-2 py-1.5 text-[12px] text-ink-900 ring-1 ring-ink-900/5 focus:bg-ink-900/[0.06] focus:outline-none focus:ring-ink-900/20"
    >
      {children}
    </select>
  );
}
function SmallSubmit({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="rounded-full bg-ink-900 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-cream-50 transition hover:bg-ink-800"
    >
      {children}
    </button>
  );
}
