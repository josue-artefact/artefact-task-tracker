import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { PriorityPill, StatusPill } from "@/components/PriorityPill";
import { setStatus } from "@/app/actions/tasks";
import { priorityRank, formatRelative } from "@/lib/format";

export const dynamic = "force-dynamic";

const COLUMNS: { status: "TODO" | "DOING" | "DONE"; label: string }[] = [
  { status: "TODO",  label: "Por hacer" },
  { status: "DOING", label: "En curso"  },
  { status: "DONE",  label: "Hecho"     },
];

export default async function KanbanPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; team?: string }>;
}) {
  const user = await requireUser();
  const isPM = user.role === "PM";
  const sp = await searchParams;

  const [clients, teams, tasks] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.task.findMany({
      where: {
        archivedAt: null,
        // Members only see their own tasks. PMs see everything.
        ...(isPM ? {} : { assigneeId: user.id }),
        ...(sp.client ? { clientId: sp.client } : {}),
        ...(sp.team ? { teamId: sp.team } : {}),
      },
      include: {
        client: true,
        team: true,
        assignee: true,
      },
      orderBy: [{ updatedAt: "desc" }],
    }),
  ]);

  const sorted = [...tasks].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
  const grouped = {
    TODO: sorted.filter((t) => t.status === "TODO"),
    DOING: sorted.filter((t) => t.status === "DOING"),
    DONE: sorted.filter((t) => t.status === "DONE"),
  };

  // Build filter chip helpers
  const baseQuery = (overrides: Record<string, string | null>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...overrides })) {
      if (v) params.set(k, v as string);
    }
    const qs = params.toString();
    return qs ? `/kanban?${qs}` : "/kanban";
  };

  const activeClient = sp.client ? clients.find((c) => c.id === sp.client) : null;
  const activeTeam = sp.team ? teams.find((t) => t.id === sp.team) : null;

  return (
    <AppShell user={user}>
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 animate-fade-up">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-ink-500">
            <span className="inline-block h-1 w-6 bg-accent-lime" />
            Kanban
          </div>
          <h1 className="mt-3 font-semibold tracking-tight text-[clamp(28px,4vw,44px)] leading-[1.05] text-ink-900">
            {isPM ? "Todo el estudio." : "Tu trabajo, en movimiento."}
          </h1>
        </div>

        <div className="flex items-center gap-1.5 text-[11px]">
          {(activeClient || activeTeam) && (
            <Link
              href="/kanban"
              className="rounded-full bg-ink-900/[0.04] px-3 py-1.5 uppercase tracking-[0.18em] text-ink-500 ring-1 ring-ink-900/5 transition hover:bg-cream-300 hover:text-ink-900"
            >
              Limpiar
            </Link>
          )}
        </div>
      </header>

      {/* Filters */}
      <section className="mb-8 grid gap-3 sm:grid-cols-2 animate-fade-up [animation-delay:80ms]">
        <FilterGroup label="Cliente">
          <FilterChip href={baseQuery({ client: null })} active={!sp.client}>Todos</FilterChip>
          {clients.map((c) => (
            <FilterChip key={c.id} href={baseQuery({ client: c.id })} active={sp.client === c.id}>
              {c.name}
            </FilterChip>
          ))}
        </FilterGroup>

        <FilterGroup label="Equipo">
          <FilterChip href={baseQuery({ team: null })} active={!sp.team}>Todos</FilterChip>
          {teams.map((t) => (
            <FilterChip key={t.id} href={baseQuery({ team: t.id })} active={sp.team === t.id}>
              {t.name}
            </FilterChip>
          ))}
        </FilterGroup>
      </section>

      {/* Columns */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {COLUMNS.map((col, idx) => {
          const items = grouped[col.status];
          return (
            <div
              key={col.status}
              className="flex h-full flex-col rounded-2xl bg-cream-100 border border-ink-300/30 p-4 animate-fade-up"
              style={{ animationDelay: `${120 + idx * 80}ms` }}
            >
              <div className="mb-4 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <StatusPill status={col.status} />
                  <span className="text-[10px] uppercase tracking-[0.22em] text-ink-500">{col.label}</span>
                </div>
                <span className="font-semibold tracking-tight text-[18px] text-ink-700">{items.length}</span>
              </div>

              <div className="flex flex-col gap-2">
                {items.length === 0 && (
                  <p className="px-2 py-8 text-center text-[11px] uppercase tracking-[0.18em] text-ink-400">
                    Nada por aquí.
                  </p>
                )}
                {items.map((t) => (
                  <KanbanCard
                    key={t.id}
                    task={t}
                    currentStatus={col.status}
                    canMove={isPM || t.assigneeId === user.id}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </AppShell>
  );
}

/* ---------------- subcomponents ---------------- */

type TaskCard = Awaited<ReturnType<typeof prisma.task.findMany>>[number] & {
  client: { name: string };
  team: { name: string };
  assignee: { handle: string; name: string } | null;
};

function KanbanCard({
  task,
  currentStatus,
  canMove,
}: {
  task: TaskCard;
  currentStatus: "TODO" | "DOING" | "DONE";
  canMove: boolean;
}) {
  const order: ("TODO" | "DOING" | "DONE")[] = ["TODO", "DOING", "DONE"];
  const idx = order.indexOf(currentStatus);
  const prev = idx > 0 ? order[idx - 1] : null;
  const next = idx < order.length - 1 ? order[idx + 1] : null;
  const isDone = currentStatus === "DONE";

  return (
    <article className="group rounded-xl bg-cream-200 border border-ink-300/30 p-3 transition-all duration-300 hover:border-ink-300/60 hover:bg-cream-200/80">
      <Link href={`/task/${task.id}`} className="block">
        <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] text-ink-500">
          <span className="truncate">{task.client.name}</span>
          <span className="opacity-30">·</span>
          <span className="truncate">{task.team.name}</span>
        </div>
        <h4 className={`mt-1.5 font-semibold tracking-tight text-[15px] leading-snug ${isDone ? "text-ink-500 line-through decoration-ink-400/40" : "text-ink-900"}`}>
          {task.title}
        </h4>
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <PriorityPill priority={task.priority} />
          {task.assignee && (
            <span className="rounded-full bg-ink-900/[0.04] px-2 py-1 font-mono text-[10px] text-ink-700 ring-1 ring-ink-900/5">
              @{task.assignee.handle}
            </span>
          )}
        </div>
        <span className="text-[9px] uppercase tracking-[0.18em] text-ink-400">
          {formatRelative(task.updatedAt)}
        </span>
      </div>

      {canMove && (prev || next) && (
        <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-ink-300/30 pt-2.5">
          {prev && (
            <form action={setStatus}>
              <input type="hidden" name="id" value={task.id} />
              <input type="hidden" name="status" value={prev} />
              <MoveButton direction="left" />
            </form>
          )}
          {next && (
            <form action={setStatus}>
              <input type="hidden" name="id" value={task.id} />
              <input type="hidden" name="status" value={next} />
              <MoveButton direction="right" />
            </form>
          )}
        </div>
      )}
    </article>
  );
}

function MoveButton({ direction }: { direction: "left" | "right" }) {
  return (
    <button
      type="submit"
      aria-label={direction === "left" ? "Mover atrás" : "Mover adelante"}
      className="flex h-7 w-7 items-center justify-center rounded-full bg-cream-100 text-ink-500 border border-ink-300/40 transition-all duration-300 hover:bg-accent-lime hover:text-cream-50 hover:border-accent-lime active:scale-95"
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {direction === "left" ? <path d="M19 12H5M11 18l-6-6 6-6" /> : <path d="M5 12h14M13 6l6 6-6 6" />}
      </svg>
    </button>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-ink-500">{label}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={[
        "rounded-full px-2.5 py-1 text-[11px] transition-all duration-300",
        active
          ? "bg-accent-lime/15 text-accent-lime ring-1 ring-accent-lime/30"
          : "bg-ink-900/[0.04] text-ink-700 ring-1 ring-ink-900/5 hover:bg-ink-900/[0.08]",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}
