import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { priorityDot, priorityLabel, formatDate } from "@/lib/format";
import { formatDurationCompact } from "@/lib/time";
import {
  addDays,
  blocksInRange,
  dateToIso,
  dayLoadSummary,
  DEFAULT_DAILY_CAPACITY_MIN,
  isoToDate,
  scheduleTasks,
  startOfDay,
  startOfWeekMonday,
  weekDays,
  type SchedulableTask,
} from "@/lib/calendar";

export const dynamic = "force-dynamic";

const DAY_NAMES_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie"];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string; weekStart?: string }>;
}) {
  const me = await requireUser();
  const sp = await searchParams;
  const isPM = me.role === "PM";

  // ¿Calendario de quién? Members solo ven el suyo; PMs pueden ver cualquiera.
  let viewedUserId = me.id;
  if (isPM && sp.user) {
    const target = await prisma.user.findFirst({ where: { handle: sp.user } });
    if (target) viewedUserId = target.id;
  }

  const [viewedUser, allMembers, tasksRaw] = await Promise.all([
    prisma.user.findUnique({
      where: { id: viewedUserId },
      select: { id: true, name: true, handle: true, role: true, team: { select: { name: true } } },
    }),
    isPM
      ? prisma.user.findMany({
          select: { id: true, handle: true, name: true, role: true },
          orderBy: [{ role: "asc" }, { name: "asc" }],
        })
      : Promise.resolve([]),
    prisma.task.findMany({
      where: { assigneeId: viewedUserId, archivedAt: null },
      include: { client: { select: { name: true } } },
    }),
  ]);

  if (!viewedUser) redirect("/calendar");

  // Bloques scheduleados — todo lo schedulable, no solo la semana visible.
  // Después filtramos por la ventana semanal.
  const schedulable: SchedulableTask[] = tasksRaw
    .filter((t) => t.estimatedMinutes != null && t.estimatedMinutes > 0)
    .map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      status: t.status,
      estimatedMinutes: t.estimatedMinutes!,
      dueDate: t.dueDate,
      createdAt: t.createdAt,
      client: t.client,
    }));

  const today = startOfDay(new Date());
  const allBlocks = scheduleTasks(schedulable, { startDate: today });

  // Semana visible — defaults a la semana actual (lunes).
  let weekStart = sp.weekStart ? isoToDate(sp.weekStart) : null;
  if (!weekStart) weekStart = startOfWeekMonday(today);
  const days = weekDays(weekStart);
  const weekEnd = days[days.length - 1];
  const visibleBlocks = blocksInRange(allBlocks, days[0], weekEnd);
  const loadByDay = dayLoadSummary(visibleBlocks);

  // Tareas sin estimar (no aparecen en calendario)
  const unestimated = tasksRaw.filter(
    (t) => (t.estimatedMinutes == null || t.estimatedMinutes <= 0) && t.status !== "DONE" && t.status !== "REVIEW",
  );

  // Navegación de semana
  const prevWeek = dateToIso(addDays(weekStart, -7));
  const nextWeek = dateToIso(addDays(weekStart, 7));
  const isCurrentWeek = dateToIso(weekStart) === dateToIso(startOfWeekMonday(today));

  // URL helper que preserva ?user
  const linkWith = (params: Record<string, string | null>) => {
    const url = new URLSearchParams();
    if (sp.user) url.set("user", sp.user);
    for (const [k, v] of Object.entries(params)) {
      if (v === null) url.delete(k);
      else url.set(k, v);
    }
    const qs = url.toString();
    return qs ? `/calendar?${qs}` : "/calendar";
  };

  return (
    <AppShell user={me}>
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 animate-fade-up">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-ink-500">
            <span className="inline-block h-1 w-6 bg-accent-lime" />
            Calendario
          </div>
          <h1 className="mt-3 font-semibold tracking-tight text-[clamp(28px,4vw,44px)] leading-[1.05] text-ink-900">
            {isPM && viewedUserId !== me.id
              ? `Carga de ${viewedUser.name}`
              : "Tu carga semanal"}
          </h1>
          <p className="mt-2 text-[13px] text-ink-600">
            Capacidad: <strong className="text-ink-900">{DEFAULT_DAILY_CAPACITY_MIN / 60}h / día</strong> · Lun–Vie · Las tareas se ordenan por
            prioridad y se bloquean según su estimación.
          </p>
        </div>
      </header>

      {/* Member switcher (PM only) */}
      {isPM && allMembers.length > 0 && (
        <section className="mb-5 flex flex-wrap items-center gap-1.5 animate-fade-up [animation-delay:60ms]">
          <span className="mr-2 text-[10px] uppercase tracking-[0.22em] text-ink-500">Miembro:</span>
          <Link
            href={linkWith({ user: null })}
            className={[
              "rounded-full px-3 py-1.5 text-[11px] transition",
              !sp.user
                ? "bg-accent-lime/15 text-accent-lime ring-1 ring-accent-lime/30"
                : "bg-cream-100 border border-ink-300/40 text-ink-700 hover:bg-cream-200 hover:text-ink-900",
            ].join(" ")}
          >
            Yo
          </Link>
          {allMembers
            .filter((u) => u.id !== me.id)
            .map((u) => {
              const active = sp.user === u.handle;
              return (
                <Link
                  key={u.id}
                  href={linkWith({ user: u.handle })}
                  className={[
                    "rounded-full px-3 py-1.5 text-[11px] transition",
                    active
                      ? "bg-accent-lime/15 text-accent-lime ring-1 ring-accent-lime/30"
                      : "bg-cream-100 border border-ink-300/40 text-ink-700 hover:bg-cream-200 hover:text-ink-900",
                  ].join(" ")}
                >
                  {u.name}
                </Link>
              );
            })}
        </section>
      )}

      {/* Week navigation */}
      <section className="mb-4 flex items-center justify-between gap-2 animate-fade-up [animation-delay:100ms]">
        <div className="flex items-center gap-1.5">
          <Link
            href={linkWith({ weekStart: prevWeek })}
            aria-label="Semana anterior"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-cream-100 border border-ink-300/40 text-ink-700 transition hover:bg-cream-200 hover:text-ink-900"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          {!isCurrentWeek && (
            <Link
              href={linkWith({ weekStart: dateToIso(startOfWeekMonday(today)) })}
              className="rounded-full bg-cream-100 border border-ink-300/40 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-700 transition hover:bg-cream-200 hover:text-ink-900"
            >
              Hoy
            </Link>
          )}
          <Link
            href={linkWith({ weekStart: nextWeek })}
            aria-label="Semana siguiente"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-cream-100 border border-ink-300/40 text-ink-700 transition hover:bg-cream-200 hover:text-ink-900"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        </div>
        <div className="text-[12px] text-ink-700">
          Semana del <strong className="text-ink-900">{formatDate(days[0])}</strong> al{" "}
          <strong className="text-ink-900">{formatDate(days[4])}</strong>
        </div>
      </section>

      {/* Week grid */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-5 animate-fade-up [animation-delay:140ms]">
        {days.map((day) => {
          const dayKey = dateToIso(day);
          const dayBlocks = visibleBlocks.filter((b) => dateToIso(b.date) === dayKey);
          const loaded = loadByDay.get(dayKey) ?? 0;
          const loadPct = Math.min(100, Math.round((loaded / DEFAULT_DAILY_CAPACITY_MIN) * 100));
          const dayIdx = days.indexOf(day);
          const isToday = dateToIso(day) === dateToIso(today);

          return (
            <div
              key={dayKey}
              className={`rounded-2xl bg-cream-100 border ${isToday ? "border-accent-lime/40" : "border-ink-300/30"} p-3`}
            >
              {/* Day header */}
              <div className="mb-3 flex items-baseline justify-between">
                <div>
                  <div className={`text-[10px] uppercase tracking-[0.22em] ${isToday ? "text-accent-lime" : "text-ink-500"}`}>
                    {DAY_NAMES_SHORT[dayIdx]} {day.getDate()}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-ink-500">
                    {formatDurationCompact(loaded)} / {formatDurationCompact(DEFAULT_DAILY_CAPACITY_MIN)}
                  </div>
                </div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400">{loadPct}%</div>
              </div>

              {/* Day capacity bar */}
              <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-cream-50 border border-ink-300/30">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    loadPct >= 100 ? "bg-accent-rust" : loadPct >= 80 ? "bg-accent-warning" : "bg-accent-lime"
                  }`}
                  style={{ width: `${loadPct}%` }}
                />
              </div>

              {/* Blocks */}
              <div className="space-y-1.5" style={{ minHeight: 240 }}>
                {dayBlocks.length === 0 ? (
                  <p className="py-8 text-center text-[10px] uppercase tracking-[0.18em] text-ink-400">Libre</p>
                ) : (
                  dayBlocks.map((b) => {
                    // Altura proporcional a duración. 1 hora ≈ 36px (240px capacidad / 6.67h)
                    const heightPx = Math.max(36, Math.round((b.durationMinutes / DEFAULT_DAILY_CAPACITY_MIN) * 240));
                    return (
                      <Link
                        key={`${b.taskId}-${b.partIndex}`}
                        href={`/task/${b.taskId}`}
                        style={{ minHeight: heightPx }}
                        className="group block rounded-lg bg-cream-50 border border-ink-300/40 px-3 py-2 transition hover:bg-cream-200 hover:border-ink-300/60"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${priorityDot(b.task.priority)}`} />
                          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-500">
                            {formatDurationCompact(b.durationMinutes)}
                            {b.totalParts > 1 && ` · ${b.partIndex}/${b.totalParts}`}
                          </span>
                          {b.isContinuation && (
                            <span className="text-[9px] text-ink-400" title="Continuación de tarea anterior">↩</span>
                          )}
                        </div>
                        <h4 className="mt-1 line-clamp-2 font-medium text-[13px] leading-tight text-ink-900">
                          {b.task.title}
                        </h4>
                        <div className="mt-1 truncate text-[10px] uppercase tracking-[0.18em] text-ink-500">
                          {b.task.client.name} · {priorityLabel(b.task.priority)}
                          {b.task.dueDate && ` · vence ${formatDate(b.task.dueDate)}`}
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Unestimated tasks — al pie, fuerza al PM a estimar */}
      {unestimated.length > 0 && (
        <section className="mt-8 animate-fade-up [animation-delay:200ms]">
          <h2 className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-ink-500">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-accent-warning" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            Sin estimar · {unestimated.length} {isPM && "— estima para que entren al calendario"}
          </h2>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {unestimated.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/task/${t.id}`}
                  className="group block rounded-xl bg-cream-100 border border-ink-300/30 px-4 py-2.5 transition hover:bg-cream-200 hover:border-ink-300/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-500">
                        <span className={`h-1 w-1 rounded-full ${priorityDot(t.priority)}`} />
                        <span>{t.client.name}</span>
                        <span className="opacity-30">·</span>
                        <span>{priorityLabel(t.priority)}</span>
                      </div>
                      <h4 className="mt-0.5 truncate font-medium text-[14px] text-ink-900">{t.title}</h4>
                    </div>
                    {t.dueDate && (
                      <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-ink-400">
                        vence {formatDate(t.dueDate)}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  );
}
