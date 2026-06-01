import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { AnnouncementBoard } from "@/components/AnnouncementBoard";
import { PriorityPill, StatusPill } from "@/components/PriorityPill";
import { priorityRank, formatRelative, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const user = await requireUser();

  // Cargo en paralelo: (1) tareas asignadas a mí, (2) tareas donde soy reviewer
  // (status REVIEW). Las del reviewer pueden o no estar asignadas a mí también
  // (en el caso edge de auto-asignarme), así que las trato como conjunto aparte.
  const [tasks, awaitingMyReview] = await Promise.all([
    prisma.task.findMany({
      where: { assigneeId: user.id, archivedAt: null },
      include: { client: true, team: true, reviewer: { select: { handle: true, name: true } } },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.task.findMany({
      where: { reviewerId: user.id, status: "REVIEW", archivedAt: null },
      include: {
        client: true,
        team: true,
        assignee: { select: { handle: true, name: true } },
      },
      orderBy: [{ reviewRequestedAt: "desc" }],
    }),
  ]);

  /**
   * Sort inteligente: lo que más quema primero.
   *   1. DONE siempre al final
   *   2. Vencidas primero (más vencida primero — más días en rojo)
   *   3. Por prioridad (URGENT → HIGH → MEDIUM → LOW)
   *   4. Dentro de la misma prioridad, por dueDate cercana
   *      (las que tienen fecha primero, ordenadas por proximidad)
   *   5. Sin fecha y misma prioridad → updatedAt desc
   */
  const sorted = [...tasks].sort((a, b) => {
    // 1. DONE al final
    if (a.status === "DONE" && b.status !== "DONE") return 1;
    if (b.status === "DONE" && a.status !== "DONE") return -1;

    const now = Date.now();
    const aOverdue = a.dueDate && a.dueDate.getTime() < now;
    const bOverdue = b.dueDate && b.dueDate.getTime() < now;

    // 2. Vencidas primero
    if (aOverdue && !bOverdue) return -1;
    if (bOverdue && !aOverdue) return 1;
    if (aOverdue && bOverdue) {
      // entre vencidas, la más antigua primero (más urgente)
      return a.dueDate!.getTime() - b.dueDate!.getTime();
    }

    // 3. Por prioridad
    const pDiff = priorityRank(a.priority) - priorityRank(b.priority);
    if (pDiff !== 0) return pDiff;

    // 4. dueDate cercana primero (con fecha > sin fecha)
    if (a.dueDate && !b.dueDate) return -1;
    if (b.dueDate && !a.dueDate) return 1;
    if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();

    // 5. updatedAt desc
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  // Buckets: active (TODO/DOING) — review (REVIEW siendo assignee, esperando) — done
  const active = sorted.filter((t) => t.status !== "DONE" && t.status !== "REVIEW");
  const awaitingMine = sorted.filter((t) => t.status === "REVIEW");
  const done = sorted.filter((t) => t.status === "DONE");

  const counts = {
    urgent: active.filter((t) => t.priority === "URGENT").length,
    high: active.filter((t) => t.priority === "HIGH").length,
    doing: active.filter((t) => t.status === "DOING").length,
    awaitingMyReview: awaitingMyReview.length,
  };

  return (
    <AppShell user={user}>
      {/* Tablón de anuncios */}
      <AnnouncementBoard isPM={user.role === "PM"} />

      {/* Hero */}
      <section className="mb-8 animate-fade-up">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-ink-500">
          <span className="inline-block h-1 w-6 bg-accent-lime" />
          Tu bandeja
        </div>
        <h1 className="mt-3 font-semibold tracking-tight text-[clamp(28px,4vw,44px)] leading-[1.05] text-ink-900">
          Hola, {user.name}.
        </h1>
        <p className="mt-3 max-w-xl text-[14px] text-ink-600">
          {active.length === 0
            ? "Nada pendiente. Disfruta la calma."
            : `Tienes ${active.length} ${active.length === 1 ? "tarea abierta" : "tareas abiertas"}${
                counts.urgent ? ` · ${counts.urgent} urgente${counts.urgent === 1 ? "" : "s"}` : ""
              }.`}
        </p>
      </section>

      {/* Para tu revisión — solo aparece si soy reviewer de alguna tarea */}
      {awaitingMyReview.length > 0 && (
        <section className="mb-10 animate-fade-up [animation-delay:80ms]">
          <h2 className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-accent-warning">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Para tu revisión · {awaitingMyReview.length}
          </h2>
          <ul className="space-y-2">
            {awaitingMyReview.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/task/${t.id}`}
                  className="group block rounded-xl bg-accent-warning/10 border border-accent-warning/30 px-5 py-4 transition hover:bg-accent-warning/15"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-ink-500">
                        <span>{t.client.name}</span>
                        <span className="opacity-30">·</span>
                        <span>{t.team.name}</span>
                        {t.assignee && (
                          <>
                            <span className="opacity-30">·</span>
                            <span className="font-mono">de @{t.assignee.handle}</span>
                          </>
                        )}
                        {t.reviewerIsClient && (
                          <>
                            <span className="opacity-30">·</span>
                            <span className="rounded-full bg-accent-warning/20 px-1.5 py-0.5 text-accent-warning text-[9px]">sign-off cliente</span>
                          </>
                        )}
                      </div>
                      <h3 className="mt-1 truncate font-semibold tracking-tight text-[17px] leading-snug text-ink-900">
                        {t.title}
                      </h3>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <PriorityPill priority={t.priority} />
                      <span className="text-[10px] uppercase tracking-[0.2em] text-ink-400">
                        {t.reviewRequestedAt ? formatRelative(t.reviewRequestedAt) : ""}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Bento metrics */}
      <section className="mb-10 grid grid-cols-3 gap-3">
        {[
          { label: "Abiertas", value: active.length, tone: "hero" as const },
          { label: "En curso", value: counts.doing, tone: "default" as const },
          { label: "Alta & urgente", value: counts.urgent + counts.high, tone: "default" as const },
        ].map((m, i) => (
          <div
            key={m.label}
            className={`flex items-end justify-between rounded-2xl px-5 py-5 sm:px-6 sm:py-6 animate-fade-up ${
              m.tone === "hero"
                ? "bg-cream-200 border border-ink-300/30"
                : "bg-cream-100 border border-ink-300/30"
            }`}
            style={{ animationDelay: `${100 + i * 80}ms` }}
          >
            <span className="text-[10px] uppercase tracking-[0.22em] text-ink-500">{m.label}</span>
            <span className="font-semibold tracking-tight text-[40px] sm:text-[48px] leading-none text-ink-900">
              {m.value}
            </span>
          </div>
        ))}
      </section>

      {/* Open tasks list */}
      <section>
        <h2 className="mb-3 text-[11px] uppercase tracking-[0.22em] text-ink-500">Activas</h2>

        {active.length === 0 && (
          <div className="rounded-2xl bg-cream-100 border border-ink-300/30 px-8 py-14 text-center">
            <p className="font-semibold tracking-tight text-xl text-ink-700">Todo al día.</p>
            <p className="mt-2 text-sm text-ink-500">Cuando lleguen tareas nuevas, aparecerán aquí.</p>
          </div>
        )}

        <ul className="space-y-2">
          {active.map((t, i) => (
            <li key={t.id}>
              <Link
                href={`/task/${t.id}`}
                className="group block rounded-xl bg-cream-100 border border-ink-300/30 px-5 py-4 transition-all duration-300 hover:bg-cream-200 hover:border-ink-300/60 animate-fade-up"
                style={{ animationDelay: `${120 + i * 40}ms` }}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-ink-500">
                      <span>{t.client.name}</span>
                      <span className="opacity-30">·</span>
                      <span>{t.team.name}</span>
                    </div>
                    <h3 className="mt-1 truncate font-semibold tracking-tight text-[17px] leading-snug text-ink-900">
                      {t.title}
                    </h3>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <PriorityPill priority={t.priority} />
                    <StatusPill status={t.status} />
                    {t.dueDate && t.status !== "DONE" && <DueChip dueDate={t.dueDate} />}
                    <span className="hidden sm:inline text-[10px] uppercase tracking-[0.2em] text-ink-400">
                      {formatRelative(t.updatedAt)}
                    </span>
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-900/[0.05] text-ink-500 transition-all duration-300 group-hover:bg-cream-300 group-hover:text-ink-900 group-hover:translate-x-0.5"
                      aria-hidden
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Esperando revisión — mis tareas que mandé a revisar */}
      {awaitingMine.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-[11px] uppercase tracking-[0.22em] text-ink-500">
            Esperando revisión · {awaitingMine.length}
          </h2>
          <ul className="space-y-1.5">
            {awaitingMine.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/task/${t.id}`}
                  className="group block rounded-xl bg-cream-100/70 border border-ink-300/20 px-4 py-3 transition hover:bg-cream-200 hover:border-ink-300/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500">
                        {t.client.name} · {t.team.name}
                        {t.reviewer && (
                          <>
                            <span className="opacity-30"> · </span>
                            <span className="font-mono">revisa @{t.reviewer.handle}</span>
                          </>
                        )}
                      </div>
                      <h3 className="truncate font-medium text-[15px] leading-snug text-ink-700">
                        {t.title}
                      </h3>
                    </div>
                    <span className="shrink-0 text-[10px] uppercase tracking-[0.2em] text-ink-400">
                      {t.reviewRequestedAt ? formatRelative(t.reviewRequestedAt) : ""}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Tareas hechas — sección colapsada visualmente */}
      {done.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-[11px] uppercase tracking-[0.22em] text-ink-500">
            Hechas · {done.length}
          </h2>
          <ul className="space-y-1.5">
            {done.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/task/${t.id}`}
                  className="group block rounded-xl bg-cream-100/50 border border-ink-300/20 px-4 py-3 transition hover:bg-cream-100 hover:border-ink-300/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500">
                        {t.client.name} · {t.team.name}
                      </div>
                      <h3 className="truncate font-medium text-[15px] leading-snug text-ink-500 line-through decoration-ink-400/40">
                        {t.title}
                      </h3>
                    </div>
                    <span className="shrink-0 text-[10px] uppercase tracking-[0.2em] text-ink-400">
                      {formatRelative(t.updatedAt)}
                    </span>
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

/**
 * Chip de fecha de vencimiento con escalación de urgencia usando la paleta Studio Dark.
 *   < 0 días : rust fuerte    — vencida
 *   = 0 días : rust medio     — vence hoy
 *   = 1 día  : rust suave     — vence mañana
 *   2-3 días : neutral medio  — próxima
 *   > 3 días : neutral suave  — lejana
 */
function DueChip({ dueDate }: { dueDate: Date }) {
  const now = Date.now();
  const diffDays = Math.ceil((dueDate.getTime() - now) / (1000 * 60 * 60 * 24));

  let label: string;
  let tone: string;
  let showDot = false;

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    label = overdueDays > 0 ? `Vencida hace ${overdueDays}d` : "Vencida";
    tone = "bg-accent-rust/15 text-accent-rust ring-accent-rust/30";
    showDot = true;
  } else if (diffDays === 0) {
    label = "Vence hoy";
    tone = "bg-accent-rust/12 text-accent-rust ring-accent-rust/25";
    showDot = true;
  } else if (diffDays === 1) {
    label = "Vence mañana";
    tone = "bg-accent-rust/8 text-accent-rust/90 ring-accent-rust/20";
  } else if (diffDays <= 3) {
    label = `Vence en ${diffDays}d`;
    tone = "bg-ink-900/[0.06] text-ink-700 ring-ink-900/10";
  } else {
    label = `Vence ${formatDate(dueDate)}`;
    tone = "bg-ink-900/[0.04] text-ink-500 ring-ink-900/5";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ring-1 ${tone}`}
    >
      {showDot && <span className="h-1.5 w-1.5 rounded-full bg-accent-rust" />}
      {label}
    </span>
  );
}
