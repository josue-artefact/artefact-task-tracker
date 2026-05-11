import Link from "next/link";
import { requirePM } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { AnnouncementBoard } from "@/components/AnnouncementBoard";
import { ActiveNow } from "@/components/ActiveNow";
import { AdminTaskTable } from "./AdminTaskTable";
import { AdminSearchInput } from "./AdminSearchInput";

export const dynamic = "force-dynamic";

type SortKey = "title" | "client" | "team" | "assignee" | "priority" | "status" | "updated";
type SortDir = "asc" | "desc";

const VALID_SORT: SortKey[] = ["title", "client", "team", "assignee", "priority", "status", "updated"];

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; dir?: string }>;
}) {
  const user = await requirePM();
  const sp = await searchParams;
  const query = (sp.q || "").trim();
  const sortKey: SortKey = (VALID_SORT.includes(sp.sort as SortKey) ? sp.sort : "updated") as SortKey;
  const sortDir: SortDir = sp.dir === "asc" ? "asc" : "desc";

  // Build the where clause.
  // - Excluimos tareas que pertenecen a un pipeline (esas viven en su propia vista)
  // - Excluimos archivadas (esas viven en /admin/archive)
  const baseWhere = { pipelineId: null, archivedAt: null };
  const where = query
    ? {
        ...baseWhere,
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
          { client: { name: { contains: query } } },
          { team: { name: { contains: query } } },
          { assignee: { handle: { contains: query } } },
        ],
      }
    : baseWhere;

  // Priority and status need manual rank-based sort (Prisma sorts the enum
  // string alphabetically, which gives wrong results — HIGH/LOW/MEDIUM/URGENT).
  // For those we fetch with default order and sort in memory below.
  const isManualSort = sortKey === "priority" || sortKey === "status";

  const orderBy = (() => {
    if (isManualSort) return { updatedAt: "desc" as const };
    switch (sortKey) {
      case "title":    return { title: sortDir };
      case "client":   return { client: { name: sortDir } };
      case "team":     return { team: { name: sortDir } };
      case "assignee": return { assignee: { handle: sortDir } };
      case "updated":
      default:         return { updatedAt: sortDir };
    }
  })();

  const [displayTasksRaw, allTasks, archivedCount, teams, users, clients] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        client: true,
        team: true,
        assignee: true,
      },
      orderBy,
    }),
    prisma.task.findMany({ where: { archivedAt: null }, select: { status: true, priority: true } }),
    prisma.task.count({ where: { archivedAt: { not: null } } }),
    prisma.team.findMany({ include: { _count: { select: { members: true, tasks: true } } } }),
    prisma.user.findMany({
      include: { team: true, _count: { select: { assignedTasks: true } } },
      orderBy: [{ team: { name: "asc" } }, { handle: "asc" }],
    }),
    prisma.client.findMany({ include: { _count: { select: { tasks: true } } } }),
  ]);

  const open = allTasks.filter((t) => t.status !== "DONE");
  const doing = allTasks.filter((t) => t.status === "DOING").length;

  // Apply in-memory sort for priority/status by semantic rank.
  const priorityRank: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const statusRank: Record<string, number> = { TODO: 0, DOING: 1, DONE: 2 };

  const displayTasks = (() => {
    if (sortKey === "priority") {
      return [...displayTasksRaw].sort((a, b) => {
        const diff = (priorityRank[a.priority] ?? 99) - (priorityRank[b.priority] ?? 99);
        return sortDir === "asc" ? diff : -diff;
      });
    }
    if (sortKey === "status") {
      return [...displayTasksRaw].sort((a, b) => {
        const diff = (statusRank[a.status] ?? 99) - (statusRank[b.status] ?? 99);
        return sortDir === "asc" ? diff : -diff;
      });
    }
    return displayTasksRaw;
  })();

  const done = allTasks.filter((t) => t.status === "DONE").length;

  const stats = {
    open: open.length,
    urgent: open.filter((t) => t.priority === "URGENT").length,
    clients: clients.length,
    teams: teams.length,
    members: users.length,
    done,
  };

  return (
    <AppShell user={user}>
      {/* Tablón de anuncios */}
      <AnnouncementBoard isPM />

      {/* Quién está activo en qué tarea ahora */}
      <ActiveNow />

      {/* Hero */}
      <section className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between animate-fade-up">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-ink-500">
            <span className="inline-block h-1 w-6 bg-accent-lime" />
            Resumen del estudio
          </div>
          <h1 className="mt-3 font-semibold tracking-tight text-[clamp(28px,4vw,44px)] leading-[1.05] text-ink-900">
            El estudio, de un vistazo.
          </h1>
        </div>
        <Link
          href="/admin/tasks/new"
          className="group inline-flex items-center gap-1 self-start rounded-full bg-accent-lime py-2.5 pl-5 pr-2 text-[12px] font-medium uppercase tracking-[0.18em] text-cream-50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-accent-lime/85 active:scale-[0.98] md:self-auto"
        >
          <span>Nueva tarea</span>
          <span className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-cream-50/15 transition-all duration-500 group-hover:translate-x-0.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
        </Link>
      </section>

      {/* Bento metrics */}
      <section className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-12 md:grid-rows-2">
        <BentoStat span="md:col-span-6 md:row-span-2" tone="hero"    label="Tareas abiertas" value={stats.open}     delay={0}   />
        <BentoStat span="md:col-span-2"               tone="default" label="Urgentes"        value={stats.urgent}   delay={60}  />
        <BentoStat span="md:col-span-2"               tone="default" label="Clientes"        value={stats.clients}  delay={100} />
        <BentoStat span="md:col-span-2"               tone="default" label="Equipos"         value={stats.teams}    delay={140} />
        <BentoStat span="md:col-span-2"               tone="default" label="Miembros"        value={stats.members}  delay={180} />
        <BentoStat span="md:col-span-2"               tone="accent"  label="En curso"        value={doing}          delay={220} />
        <BentoStat span="md:col-span-2"               tone="default" label="Hechas"          value={stats.done}     delay={260} />
      </section>

      {/* Tasks table */}
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[11px] uppercase tracking-[0.22em] text-ink-500">Todas las tareas</h2>
            {archivedCount > 0 && (
              <Link
                href="/admin/archive"
                className="inline-flex items-center gap-1.5 rounded-full bg-ink-900/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-ink-700 ring-1 ring-ink-900/5 transition hover:bg-cream-300 hover:text-ink-900"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="4" rx="1" />
                  <path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4" />
                </svg>
                Ver archivadas ({archivedCount})
              </Link>
            )}
          </div>
          <span className="text-[11px] uppercase tracking-[0.22em] text-ink-400">
            {query
              ? `${displayTasks.length} ${displayTasks.length === 1 ? "resultado" : "resultados"} · ${allTasks.length} total`
              : `${allTasks.length} total · ${stats.open} abiertas`}
          </span>
        </div>

        <AdminSearchInput initial={query} sortKey={sortKey} sortDir={sortDir} />

        <AdminTaskTable
          tasks={displayTasks}
          users={users.map((u) => ({ id: u.id, handle: u.handle, team: u.team }))}
          query={query}
          sortKey={sortKey}
          sortDir={sortDir}
        />
      </section>
    </AppShell>
  );
}

function BentoStat({
  label,
  value,
  span,
  tone,
  delay,
}: {
  label: string;
  value: number;
  span: string;
  /** "hero" = highlighted cream-200 (más claro); "accent" = lima; "default" = neutral con hairline. */
  tone: "hero" | "accent" | "default";
  delay: number;
}) {
  const styles = {
    hero:    "bg-cream-200 border border-ink-300/30 text-ink-900",
    accent:  "bg-accent-lime border border-accent-lime text-cream-50",
    default: "bg-cream-100 border border-ink-300/30 text-ink-900",
  }[tone];

  return (
    <div
      className={`rounded-2xl p-5 sm:p-6 flex h-full flex-col justify-between animate-fade-up ${span} ${styles}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="text-[10px] uppercase tracking-[0.22em] opacity-70">{label}</span>
      <span
        className={`font-semibold tracking-tight leading-none ${
          tone === "hero" ? "text-[clamp(56px,8vw,110px)]" : "text-[40px]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
