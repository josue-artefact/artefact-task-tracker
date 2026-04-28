import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { AnnouncementBoard } from "@/components/AnnouncementBoard";
import { PriorityPill, StatusPill } from "@/components/PriorityPill";
import { priorityRank, formatRelative, formatDate, isOverdue } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const user = await requireUser();

  const tasks = await prisma.task.findMany({
    where: { assigneeId: user.id },
    include: { client: true, team: true },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });

  const sorted = [...tasks].sort((a, b) => {
    if (a.status === "DONE" && b.status !== "DONE") return 1;
    if (b.status === "DONE" && a.status !== "DONE") return -1;
    return priorityRank(a.priority) - priorityRank(b.priority);
  });

  const open = sorted.filter((t) => t.status !== "DONE");
  const done = sorted.filter((t) => t.status === "DONE");

  const counts = {
    urgent: open.filter((t) => t.priority === "URGENT").length,
    high: open.filter((t) => t.priority === "HIGH").length,
    doing: open.filter((t) => t.status === "DOING").length,
  };

  return (
    <AppShell user={user}>
      {/* Tablón de anuncios */}
      <AnnouncementBoard isPM={user.role === "PM"} />

      {/* Hero */}
      <section className="mb-12 animate-fade-up">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-ink-500">
          <span className="inline-block h-1 w-6 bg-ink-900" />
          Tu bandeja
        </div>
        <h1 className="mt-4 font-serif italic text-[clamp(40px,6vw,72px)] leading-[0.95] tracking-tightest text-ink-900">
          Hola, {user.name}.
        </h1>
        <p className="mt-3 max-w-xl text-[15px] text-ink-600">
          {open.length === 0
            ? "Nada pendiente. Disfruta la calma."
            : `Tienes ${open.length} ${open.length === 1 ? "tarea abierta" : "tareas abiertas"}${
                counts.urgent ? ` · ${counts.urgent} urgente${counts.urgent === 1 ? "" : "s"}` : ""
              }.`}
        </p>
      </section>

      {/* Bento metrics */}
      <section className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: "Abiertas", value: open.length, accent: "bg-ink-900 text-cream-50" },
          { label: "En curso", value: counts.doing, accent: "bg-cream-100 text-ink-900" },
          { label: "Alta & urgente", value: counts.urgent + counts.high, accent: "bg-cream-100 text-ink-900" },
        ].map((m, i) => (
          <div
            key={m.label}
            className="rounded-[2rem] bg-ink-900/[0.04] p-1.5 ring-1 ring-ink-900/5 animate-fade-up"
            style={{ animationDelay: `${100 + i * 80}ms` }}
          >
            <div
              className={`flex items-end justify-between rounded-[calc(2rem-0.375rem)] px-6 py-7 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] ${m.accent}`}
            >
              <span className="text-[11px] uppercase tracking-[0.22em] opacity-70">{m.label}</span>
              <span className="font-serif italic text-[56px] leading-none tracking-tightest">{m.value}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Open tasks list */}
      <section className="space-y-3">
        <h2 className="mb-3 text-[11px] uppercase tracking-[0.22em] text-ink-500">Activas</h2>

        {open.length === 0 && (
          <div className="rounded-[2rem] bg-ink-900/[0.03] p-1.5 ring-1 ring-ink-900/5">
            <div className="rounded-[calc(2rem-0.375rem)] bg-cream-50 px-8 py-16 text-center">
              <p className="font-serif italic text-2xl text-ink-700">Todo al día.</p>
              <p className="mt-2 text-sm text-ink-500">Cuando lleguen tareas nuevas, aparecerán aquí.</p>
            </div>
          </div>
        )}

        {open.map((t, i) => (
          <Link
            key={t.id}
            href={`/task/${t.id}`}
            className="group block rounded-[2rem] bg-ink-900/[0.04] p-1.5 ring-1 ring-ink-900/5 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-ink-900/[0.06] hover:ring-ink-900/10 animate-fade-up"
            style={{ animationDelay: `${120 + i * 50}ms` }}
          >
            <article className="flex flex-col gap-4 rounded-[calc(2rem-0.375rem)] bg-cream-50 px-6 py-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-ink-500">
                  <span>{t.client.name}</span>
                  <span className="opacity-30">·</span>
                  <span>{t.team.name}</span>
                </div>
                <h3 className="mt-1.5 truncate font-serif italic text-[22px] leading-snug text-ink-900">
                  {t.title}
                </h3>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <PriorityPill priority={t.priority} />
                <StatusPill status={t.status} />
                {t.dueDate && isOverdue(t.dueDate) && t.status !== "DONE" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-rust/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-accent-rust ring-1 ring-accent-rust/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent-rust" />
                    Vencida {formatDate(t.dueDate)}
                  </span>
                )}
                <span className="text-[10px] uppercase tracking-[0.2em] text-ink-400">
                  {formatRelative(t.updatedAt)}
                </span>
                <span
                  className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-ink-900/[0.05] text-ink-700 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:bg-ink-900 group-hover:text-cream-50 group-hover:translate-x-0.5"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </div>
            </article>
          </Link>
        ))}
      </section>

      {done.length > 0 && (
        <section className="mt-12 space-y-3">
          <h2 className="mb-3 text-[11px] uppercase tracking-[0.22em] text-ink-500">
            Hechas · {done.length}
          </h2>
          {done.map((t) => (
            <Link
              key={t.id}
              href={`/task/${t.id}`}
              className="group block rounded-[1.5rem] bg-ink-900/[0.02] px-5 py-4 ring-1 ring-ink-900/[0.04] transition hover:bg-ink-900/[0.04]"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-ink-400">
                    {t.client.name} · {t.team.name}
                  </div>
                  <h3 className="truncate font-serif italic text-[17px] leading-snug text-ink-500 line-through decoration-ink-300">
                    {t.title}
                  </h3>
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-ink-400">
                  {formatRelative(t.updatedAt)}
                </span>
              </div>
            </Link>
          ))}
        </section>
      )}
    </AppShell>
  );
}
