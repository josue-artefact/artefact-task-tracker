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
  healthFill,
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
        <Link href="/admin/pipelines" className="inline-flex items-center gap-2 hover:text-ink-900 transition">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          Pipelines
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-ink-700">{pipeline.client.name}</span>
          <span className="opacity-30">·</span>
          <span>arranca {formatDate(pipeline.startDate)}</span>
        </div>
      </div>

      {/* Header */}
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 animate-fade-up">
        <div className="min-w-0">
          <h1 className="font-semibold tracking-tight text-[clamp(28px,4vw,52px)] leading-[1.05] text-ink-900">
            {pipeline.name}
          </h1>
          {pipeline.description && (
            <p className="mt-3 max-w-2xl text-[14px] text-ink-600">{pipeline.description}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-full bg-cream-100 border border-ink-300/30 px-3 py-1.5">
              <span className={`h-2 w-2 rounded-full ${healthDot(health)}`} />
              <span className="text-[10px] uppercase tracking-[0.18em] text-ink-700">{healthLabel(health)}</span>
            </div>
            <span className="rounded-full bg-cream-100 border border-ink-300/30 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-700">
              {doneTasks} / {totalTasks} tareas · {progress}%
            </span>
            {pipeline.savedAsTemplate && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-lime/15 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-accent-lime ring-1 ring-accent-lime/30">
                <span className="h-1 w-1 rounded-full bg-accent-lime" />
                Template
              </span>
            )}
            {pipeline.status !== "ACTIVE" && (
              <span className="rounded-full bg-cream-100 border border-ink-300/30 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-700">
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
              <EditPanel className="absolute right-0 mt-2 w-80 rounded-2xl bg-cream-100 border border-ink-300/40 p-4 shadow-[0_20px_60px_rgba(9,9,11,0.10)] z-20">
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
              <EditPanel className="absolute right-0 mt-2 w-80 rounded-2xl bg-cream-100 border border-ink-300/40 p-4 shadow-[0_20px_60px_rgba(9,9,11,0.10)] z-20">
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
                      className="h-3.5 w-3.5 rounded border-ink-300 accent-accent-lime"
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
                className="rounded-full bg-cream-50 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-accent-rust border border-accent-rust/30 transition hover:bg-accent-rust hover:text-on-accent hover:border-accent-rust"
              >
                Borrar
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="h-2 w-full overflow-hidden rounded-full bg-cream-100 border border-ink-300/30">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${healthFill(health)}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Tasks list */}
      <h2 className="mb-3 text-[11px] uppercase tracking-[0.22em] text-ink-500">
        Tareas en orden
      </h2>

      {pipeline.tasks.length === 0 && (
        <div className="rounded-2xl bg-cream-100 border border-ink-300/30 px-8 py-12 text-center text-sm text-ink-400">
          Este pipeline no tiene tareas.
        </div>
      )}

      <ol className="space-y-2">
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
              <div className="rounded-xl bg-cream-100 border border-ink-300/30 p-4 transition hover:border-ink-300/60">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-cream-200 border border-ink-300/40 px-1.5 text-[10px] font-medium text-ink-700">
                        {t.pipelineOrder ?? "—"}
                      </span>
                      <Link
                        href={`/task/${t.id}`}
                        className="font-semibold tracking-tight text-[18px] text-ink-900 hover:text-ink-700 transition"
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
                        <Link href={`/task/${t.blockedByTask.id}`} className="text-ink-700 hover:text-ink-900 underline-offset-2 hover:underline transition">
                          #{t.blockedByTask.pipelineOrder} · {t.blockedByTask.title}
                        </Link>
                      </div>
                    )}

                    {/* Cliente blocker */}
                    {t.blockedByClient && (
                      <div className="mt-3 rounded-xl bg-accent-warning/10 border border-accent-warning/30 px-3 py-2.5">
                        <div className="flex items-start gap-2 text-[11px] text-accent-warning">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent-warning shrink-0" />
                          <div>
                            <strong className="font-semibold">Esperando aprobación del cliente</strong>
                            {t.blockedSince && (
                              <span className="text-accent-warning/80"> desde hace {blockedDays} día{blockedDays === 1 ? "" : "s"}</span>
                            )}
                            {reminderDays !== null && (
                              <span className="text-accent-warning/80"> · último recordatorio hace {reminderDays} d</span>
                            )}
                          </div>
                        </div>
                        {canToggleBlocker && (
                          <div className="mt-2.5 flex gap-2">
                            <form action={markClientReminderSent}>
                              <input type="hidden" name="taskId" value={t.id} />
                              <button
                                type="submit"
                                className="rounded-full bg-cream-50 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-accent-warning border border-accent-warning/30 transition hover:bg-accent-warning/15"
                              >
                                Marqué recordatorio
                              </button>
                            </form>
                            <form action={toggleClientBlocker}>
                              <input type="hidden" name="taskId" value={t.id} />
                              <button
                                type="submit"
                                className="rounded-full bg-accent-warning/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-accent-warning border border-accent-warning/40 transition hover:bg-accent-warning hover:text-on-accent hover:border-accent-warning"
                              >
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
                      className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ring-1 ${tone.bg} ${tone.text} ${tone.ring}`}
                    >
                      {taskRiskLabel(risk)}
                    </span>
                    {canToggleBlocker && !t.blockedByClient && t.status !== "DONE" && (
                      <form action={toggleClientBlocker}>
                        <input type="hidden" name="taskId" value={t.id} />
                        <button
                          type="submit"
                          className="rounded-full bg-cream-50 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-ink-500 border border-ink-300/40 transition hover:bg-accent-warning/15 hover:text-accent-warning hover:border-accent-warning/30"
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
      className="w-full rounded-lg bg-cream-50 border border-ink-300/40 px-2 py-1.5 text-[12px] text-ink-900 transition-colors focus:outline-none focus:border-accent-lime/40"
    />
  );
}
function SmallSelect({ children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className="w-full rounded-lg bg-cream-50 border border-ink-300/40 px-2 py-1.5 text-[12px] text-ink-900 transition-colors focus:outline-none focus:border-accent-lime/40"
    >
      {children}
    </select>
  );
}
function SmallSubmit({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="rounded-full bg-accent-lime px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-on-accent transition hover:bg-accent-lime/85 active:scale-[0.98]"
    >
      {children}
    </button>
  );
}
