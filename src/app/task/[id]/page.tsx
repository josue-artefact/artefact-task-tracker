import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { PriorityPill, StatusPill } from "@/components/PriorityPill";
import { PRIORITIES, STATUSES, formatDate, formatRelative, priorityLabel, statusLabel, isOverdue } from "@/lib/format";
import { addComment, transferTask, setStatus, setPriority, deleteTask, updateTask } from "@/app/actions/tasks";
import { setTaskEstimate } from "@/app/actions/time";
import { toggleActiveTask } from "@/app/actions/active";
import { EditCard, EditTrigger, EditPanel } from "@/components/EditDisclosure";
import { ImproveBriefButton } from "@/components/ImproveBriefButton";
import { TimeSection } from "@/components/TimeSection";
import { formatDurationCompact } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function TaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ time_error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      client: true,
      team: true,
      assignee: true,
      createdBy: true,
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
      transfers: {
        include: { fromUser: true, toUser: true },
        orderBy: { createdAt: "desc" },
      },
      timeEntries: {
        where: { deletedAt: null },
        include: { user: true },
        orderBy: { loggedFor: "desc" },
      },
    },
  });

  if (!task) return notFound();

  const isPM = user.role === "PM";
  const isAssignee = task.assigneeId === user.id;
  const canEditStatus = isPM || isAssignee;
  const canTransfer = isPM || isAssignee;
  const canComment = true;

  // candidates for transfer — everyone but current assignee (or current user if unassigned)
  const allUsers = await prisma.user.findMany({
    include: { team: true },
    orderBy: [{ team: { name: "asc" } }, { handle: "asc" }],
  });

  // For PM edit: full client/team lists for reassignment.
  const [allClients, allTeams] = isPM
    ? await Promise.all([
        prisma.client.findMany({ orderBy: { name: "asc" } }),
        prisma.team.findMany({ orderBy: { name: "asc" } }),
      ])
    : [[], []];

  const dueDateValue = task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "";
  const overdue = task.dueDate && isOverdue(task.dueDate) && task.status !== "DONE";

  // Estado "active now" del usuario actual (para el toggle)
  const meActive = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      activeTaskId: true,
      activeSince: true,
      activeTask: { select: { id: true, title: true } },
    },
  });
  const STALE_HOURS = 8;
  const activeIsFresh =
    meActive?.activeSince &&
    Date.now() - meActive.activeSince.getTime() < STALE_HOURS * 60 * 60 * 1000;
  const isActiveOnThisTask = activeIsFresh && meActive?.activeTaskId === task.id;
  const isActiveOnOther = activeIsFresh && meActive?.activeTaskId && meActive.activeTaskId !== task.id;

  return (
    <AppShell user={user}>
      {/* Eyebrow */}
      <div className="mb-6 flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-ink-500">
        <Link href={isPM ? "/admin" : "/inbox"} className="inline-flex items-center gap-2 text-ink-500 transition hover:text-ink-900">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          Volver
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-ink-900 px-2 py-0.5 text-cream-50">{task.client.name}</span>
          <span className="opacity-30">·</span>
          <span>{task.team.name}</span>
        </div>
      </div>

      {/* Header */}
      <header className="mb-10 animate-fade-up">
        <h1 className="font-serif italic text-[clamp(36px,5vw,60px)] leading-[1] tracking-tightest text-ink-900">
          {task.title}
        </h1>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <PriorityPill priority={task.priority} />
          <StatusPill status={task.status} />
          {task.dueDate && (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ring-1 ${
              overdue
                ? "bg-accent-rust/10 text-accent-rust ring-accent-rust/20"
                : "bg-ink-900/[0.04] text-ink-700 ring-ink-900/5"
            }`}>
              {overdue && <span className="h-1.5 w-1.5 rounded-full bg-accent-rust" />}
              {overdue ? "Vencida" : "Vence"} {formatDate(task.dueDate)}
            </span>
          )}
          <span className="text-[10px] uppercase tracking-[0.2em] text-ink-400">
            Actualizada {formatRelative(task.updatedAt)}
          </span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Description + edit */}
          <Card>
            <EditCard>
              <div className="mb-4 flex items-center justify-between gap-3">
                <SectionLabel>Brief</SectionLabel>
                {(isPM || isAssignee) && <EditTrigger label="Editar tarea" />}
              </div>
              {task.description ? (
                <p className="font-serif italic text-[20px] leading-relaxed text-ink-800 whitespace-pre-wrap">
                  {task.description}
                </p>
              ) : (
                <p className="text-sm text-ink-400">Sin descripción.</p>
              )}
              <EditPanel className="mt-6 rounded-2xl bg-ink-900/[0.03] p-4 ring-1 ring-ink-900/5">
                <form action={updateTask} className="space-y-3">
                  <input type="hidden" name="id" value={task.id} />
                  <Field label="Título">
                    <input
                      name="title"
                      required
                      defaultValue={task.title}
                      className="w-full rounded-xl bg-cream-50 px-3 py-2.5 text-[14px] text-ink-900 ring-1 ring-ink-900/5 focus:outline-none focus:ring-ink-900/20"
                    />
                  </Field>
                  <div className="block">
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="text-[10px] uppercase tracking-[0.22em] text-ink-500">Descripción</span>
                      <ImproveBriefButton />
                    </div>
                    <textarea
                      name="description"
                      rows={3}
                      defaultValue={task.description ?? ""}
                      className="w-full resize-none rounded-xl bg-cream-50 px-3 py-2.5 text-[14px] text-ink-900 ring-1 ring-ink-900/5 focus:outline-none focus:ring-ink-900/20"
                    />
                  </div>
                  {isPM && (
                    <>
                      <Field label="Cliente">
                        <Select name="clientId" defaultValue={task.clientId}>
                          {allClients.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Equipo">
                        <Select name="teamId" defaultValue={task.teamId}>
                          {allTeams.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </Select>
                      </Field>
                    </>
                  )}
                  <Field label="Vencimiento">
                    <input
                      type="date"
                      name="dueDate"
                      defaultValue={dueDateValue}
                      className="w-full rounded-xl bg-cream-50 px-3 py-2.5 text-[13px] text-ink-900 ring-1 ring-ink-900/5 focus:outline-none focus:ring-ink-900/20"
                    />
                  </Field>
                  <div className="flex justify-end">
                    <SubmitButton>Guardar cambios</SubmitButton>
                  </div>
                </form>
              </EditPanel>
            </EditCard>
          </Card>

          {/* Time tracking */}
          <TimeSection
            taskId={task.id}
            taskStatus={task.status}
            estimatedMinutes={task.estimatedMinutes}
            entries={task.timeEntries}
            currentUserId={user.id}
            isPM={isPM}
            errorCode={sp.time_error}
          />

          {/* Comments */}
          <Card>
            <SectionLabel>Comentarios · {task.comments.length}</SectionLabel>
            <div className="space-y-5">
              {task.comments.length === 0 && (
                <p className="text-sm text-ink-400">Sé el primero en dejar una nota.</p>
              )}
              {task.comments.map((c) => (
                <div key={c.id} className="flex gap-4">
                  <Avatar name={c.author.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-ink-900">{c.author.name}</span>
                      <span className="text-[10px] uppercase tracking-[0.18em] text-ink-400">
                        @{c.author.handle} · {formatRelative(c.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-[15px] text-ink-700">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {canComment && (
              <form action={addComment} className="mt-6">
                <input type="hidden" name="taskId" value={task.id} />
                <div className="rounded-2xl bg-ink-900/[0.03] p-1 ring-1 ring-ink-900/5 focus-within:bg-ink-900/[0.05] focus-within:ring-ink-900/20">
                  <textarea
                    name="body"
                    required
                    rows={3}
                    placeholder="Escribe un comentario…"
                    className="w-full resize-none rounded-xl bg-cream-50 p-4 text-[15px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
                  />
                </div>
                <div className="mt-3 flex justify-end">
                  <SubmitButton>Comentar</SubmitButton>
                </div>
              </form>
            )}
          </Card>

          {/* Transfer history */}
          {task.transfers.length > 0 && (
            <Card>
              <SectionLabel>Historial de transferencias</SectionLabel>
              <ul className="space-y-3 text-[13px] text-ink-700">
                {task.transfers.map((t) => (
                  <li key={t.id} className="flex items-baseline gap-3">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-ink-400">
                      {formatRelative(t.createdAt)}
                    </span>
                    <span>
                      <span className="text-ink-500">@{t.fromUser.handle}</span>
                      {" → "}
                      <span className="font-medium text-ink-900">@{t.toUser.handle}</span>
                      {t.reason && <span className="text-ink-500"> · {t.reason}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* Side column */}
        <aside className="space-y-6">
          {/* Active now toggle */}
          <Card>
            <SectionLabel>
              {isActiveOnThisTask ? "Trabajando aquí" : "Activo"}
            </SectionLabel>
            <form action={toggleActiveTask}>
              <input type="hidden" name="taskId" value={task.id} />
              <button
                type="submit"
                className={[
                  "group flex w-full items-center justify-between gap-2 rounded-full py-2 pl-4 pr-2 text-[12px] font-medium uppercase tracking-[0.18em] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
                  isActiveOnThisTask
                    ? "bg-accent-lime text-ink-900 ring-1 ring-ink-900/10 hover:bg-accent-lime/80"
                    : "bg-ink-900 text-cream-50 hover:bg-ink-800",
                ].join(" ")}
              >
                <span className="flex items-center gap-2">
                  {isActiveOnThisTask ? (
                    <>
                      <span className="relative inline-flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ink-900 opacity-50" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-ink-900" />
                      </span>
                      Detener
                    </>
                  ) : isActiveOnOther ? (
                    "Cambiar a esta"
                  ) : (
                    "Empezar a trabajar"
                  )}
                </span>
                <span className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-500 group-hover:translate-x-0.5 ${
                  isActiveOnThisTask ? "bg-ink-900/15" : "bg-cream-50/15"
                }`}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {isActiveOnThisTask ? (
                      <rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor" />
                    ) : (
                      <polygon points="6,4 20,12 6,20" fill="currentColor" />
                    )}
                  </svg>
                </span>
              </button>
            </form>
            {isActiveOnThisTask && meActive?.activeSince && (
              <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-ink-500">
                activo {formatRelative(meActive.activeSince)}
              </p>
            )}
            {isActiveOnOther && meActive?.activeTask && (
              <p className="mt-3 text-[11px] text-ink-500">
                Ahora estás en{" "}
                <Link href={`/task/${meActive.activeTask.id}`} className="font-serif italic text-ink-700 hover:text-ink-900 underline-offset-2 hover:underline">
                  "{meActive.activeTask.title}"
                </Link>
              </p>
            )}
          </Card>

          <Card>
            <SectionLabel>Asignación</SectionLabel>
            <div className="flex items-center gap-3">
              {task.assignee ? <Avatar name={task.assignee.name} /> : <Avatar name="—" />}
              <div className="min-w-0">
                <div className="text-sm font-medium text-ink-900">
                  {task.assignee?.name ?? "Sin asignar"}
                </div>
                {task.assignee && (
                  <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500">
                    @{task.assignee.handle}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-2 text-[12px] text-ink-700">
              <Row label="Creada por">{task.createdBy.name}</Row>
              <Row label="Creada">{formatDate(task.createdAt)}</Row>
              <Row label="Cliente">{task.client.name}</Row>
              <Row label="Equipo">{task.team.name}</Row>
            </div>
          </Card>

          {/* Estimate (PM only) */}
          {isPM && (
            <Card>
              <SectionLabel>Estimación</SectionLabel>
              <form action={setTaskEstimate} className="space-y-2">
                <input type="hidden" name="taskId" value={task.id} />
                <input
                  name="estimate"
                  defaultValue={task.estimatedMinutes ? formatDurationCompact(task.estimatedMinutes) : ""}
                  placeholder="ej. 4h, 90m, 1h30 (vacío = sin estimación)"
                  className="w-full rounded-xl bg-ink-900/[0.04] px-3 py-2.5 text-[13px] text-ink-900 ring-1 ring-ink-900/5 placeholder:text-ink-400 focus:bg-ink-900/[0.06] focus:outline-none focus:ring-ink-900/20"
                />
                <div className="flex justify-end">
                  <SubmitButton>Guardar</SubmitButton>
                </div>
              </form>
            </Card>
          )}

          {/* Status setter */}
          {canEditStatus && (
            <Card>
              <SectionLabel>Estado</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <form key={s} action={setStatus}>
                    <input type="hidden" name="id" value={task.id} />
                    <input type="hidden" name="status" value={s} />
                    <button
                      type="submit"
                      className={[
                        "rounded-full px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                        task.status === s
                          ? "bg-ink-900 text-cream-50"
                          : "bg-ink-900/[0.04] text-ink-700 ring-1 ring-ink-900/5 hover:bg-ink-900/[0.08]",
                      ].join(" ")}
                    >
                      {statusLabel(s)}
                    </button>
                  </form>
                ))}
              </div>
            </Card>
          )}

          {/* Priority setter (PM only) */}
          {isPM && (
            <Card>
              <SectionLabel>Prioridad</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {PRIORITIES.map((p) => (
                  <form key={p} action={setPriority}>
                    <input type="hidden" name="id" value={task.id} />
                    <input type="hidden" name="priority" value={p} />
                    <button
                      type="submit"
                      className={[
                        "rounded-full px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                        task.priority === p
                          ? "bg-ink-900 text-cream-50"
                          : "bg-ink-900/[0.04] text-ink-700 ring-1 ring-ink-900/5 hover:bg-ink-900/[0.08]",
                      ].join(" ")}
                    >
                      {priorityLabel(p)}
                    </button>
                  </form>
                ))}
              </div>
            </Card>
          )}

          {/* Transfer */}
          {canTransfer && (
            <Card>
              <SectionLabel>Transferir</SectionLabel>
              <form action={transferTask} className="space-y-3">
                <input type="hidden" name="taskId" value={task.id} />
                <Select name="toUserId" required defaultValue="">
                  <option value="" disabled>Elige a quién…</option>
                  {allUsers
                    .filter((u) => u.id !== task.assigneeId)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        @{u.handle} · {u.team?.name ?? "—"}
                      </option>
                    ))}
                </Select>
                <Input name="reason" placeholder="Motivo (opcional)" />
                <div className="flex justify-end">
                  <SubmitButton>Transferir</SubmitButton>
                </div>
              </form>
            </Card>
          )}

          {/* Delete (PM only) */}
          {isPM && (
            <Card>
              <SectionLabel>Zona de peligro</SectionLabel>
              <form
                action={async (fd) => {
                  "use server";
                  await deleteTask(fd);
                }}
              >
                <input type="hidden" name="id" value={task.id} />
                <button
                  type="submit"
                  className="w-full rounded-full bg-cream-100 px-4 py-2.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-rust ring-1 ring-accent-rust/20 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-accent-rust hover:text-cream-50"
                >
                  Borrar tarea
                </button>
              </form>
            </Card>
          )}
        </aside>
      </div>
    </AppShell>
  );
}

/* ---------------- helpers ---------------- */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] bg-ink-900/[0.04] p-1.5 ring-1 ring-ink-900/5 animate-fade-up">
      <div className="rounded-[calc(2rem-0.375rem)] bg-cream-50 p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]">
        {children}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 text-[10px] uppercase tracking-[0.22em] text-ink-500">{children}</div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10px] uppercase tracking-[0.18em] text-ink-400">{label}</span>
      <span className="text-right text-[13px] text-ink-900">{children}</span>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initial = (name?.[0] ?? "?").toUpperCase();
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-900 font-serif italic text-[16px] text-cream-50">
      {initial}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl bg-ink-900/[0.04] px-3 py-2.5 text-[13px] text-ink-900 ring-1 ring-ink-900/5 placeholder:text-ink-400 focus:bg-ink-900/[0.06] focus:outline-none focus:ring-ink-900/20"
    />
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[10px] uppercase tracking-[0.22em] text-ink-500">{label}</div>
      {children}
    </label>
  );
}

function Select({ children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className="w-full rounded-xl bg-ink-900/[0.04] px-3 py-2.5 text-[13px] text-ink-900 ring-1 ring-ink-900/5 focus:bg-ink-900/[0.06] focus:outline-none focus:ring-ink-900/20"
    >
      {children}
    </select>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="group flex items-center gap-1 rounded-full bg-ink-900 py-2 pl-5 pr-2 text-[12px] font-medium uppercase tracking-[0.18em] text-cream-50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-ink-800 active:scale-[0.98]"
    >
      <span>{children}</span>
      <span className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-cream-50/15 transition-all duration-500 group-hover:translate-x-0.5">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </button>
  );
}
