import Link from "next/link";
import { requirePM } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { formatDate } from "@/lib/format";
import {
  getPipelineHealth,
  getPipelineProgress,
  healthDot,
  healthFill,
  healthLabel,
} from "@/lib/pipeline";

export const dynamic = "force-dynamic";

export default async function PipelinesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requirePM();
  const sp = await searchParams;
  const filter = sp.filter ?? "active"; // active | templates | archived

  const where = (() => {
    if (filter === "templates") return { savedAsTemplate: true };
    if (filter === "archived") return { status: "ARCHIVED" };
    return { status: { in: ["ACTIVE", "PAUSED", "DONE"] } };
  })();

  const pipelines = await prisma.pipeline.findMany({
    where,
    include: {
      client: true,
      tasks: {
        select: {
          id: true,
          status: true,
          dueDate: true,
          blockedByTaskId: true,
          blockedByClient: true,
          blockedSince: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
  });

  return (
    <AppShell user={user}>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 animate-fade-up">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-ink-500">
            <span className="inline-block h-1 w-6 bg-accent-lime" />
            Pipelines
          </div>
          <h1 className="mt-3 font-semibold tracking-tight text-[clamp(28px,4vw,44px)] leading-[1.05] text-ink-900">
            Cuerpos de trabajo, paso a paso.
          </h1>
        </div>
        <Link
          href="/admin/pipelines/new"
          className="group inline-flex items-center gap-1 self-start rounded-full bg-accent-lime py-2.5 pl-5 pr-2 text-[12px] font-medium uppercase tracking-[0.18em] text-cream-50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-accent-lime/85 active:scale-[0.98] md:self-auto"
        >
          <span>Nuevo pipeline</span>
          <span className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-cream-50/15 transition-all duration-500 group-hover:translate-x-0.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
        </Link>
      </header>

      {/* Filter tabs */}
      <div className="mb-6 flex gap-1 rounded-full bg-cream-100 border border-ink-300/30 p-1 text-[11px] uppercase tracking-[0.18em] w-max">
        <FilterTab href="/admin/pipelines" label="Activos" active={filter === "active"} />
        <FilterTab href="/admin/pipelines?filter=templates" label="Templates" active={filter === "templates"} />
        <FilterTab href="/admin/pipelines?filter=archived" label="Archivados" active={filter === "archived"} />
      </div>

      {pipelines.length === 0 && (
        <div className="rounded-2xl bg-cream-100 border border-ink-300/30 px-8 py-14 text-center">
          <p className="font-semibold tracking-tight text-xl text-ink-700">
            {filter === "templates" ? "Aún no tienes templates." : "Aún no hay pipelines."}
          </p>
          <p className="mt-2 text-sm text-ink-500">
            {filter === "templates"
              ? "Marca un pipeline como template al crearlo o editarlo."
              : 'Crea uno desde "Nuevo pipeline" para encadenar tareas con dependencias.'}
          </p>
        </div>
      )}

      <div className="grid gap-3">
        {pipelines.map((p) => {
          const health = getPipelineHealth(p.tasks);
          const progress = getPipelineProgress(p.tasks);
          const total = p.tasks.length;
          const done = p.tasks.filter((t) => t.status === "DONE").length;

          return (
            <Link
              key={p.id}
              href={`/pipeline/${p.id}`}
              className="group block rounded-2xl bg-cream-100 border border-ink-300/30 p-5 transition-all duration-300 hover:bg-cream-200 hover:border-ink-300/60 animate-fade-up"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-ink-500">
                    <span className="text-ink-700">{p.client.name}</span>
                    <span className="opacity-30">·</span>
                    <span>arranca {formatDate(p.startDate)}</span>
                    {p.savedAsTemplate && (
                      <>
                        <span className="opacity-30">·</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent-lime/15 px-2 py-0.5 text-accent-lime ring-1 ring-accent-lime/30">
                          <span className="h-1 w-1 rounded-full bg-accent-lime" />
                          Template
                        </span>
                      </>
                    )}
                    {p.status !== "ACTIVE" && (
                      <>
                        <span className="opacity-30">·</span>
                        <span className="rounded-full bg-ink-900/[0.06] px-2 py-0.5 ring-1 ring-ink-900/10">
                          {p.status === "DONE" ? "Cerrado" : p.status === "PAUSED" ? "Pausado" : "Archivado"}
                        </span>
                      </>
                    )}
                  </div>
                  <h2 className="mt-2 font-semibold tracking-tight text-[22px] leading-tight text-ink-900">
                    {p.name}
                  </h2>
                  {p.description && (
                    <p className="mt-1 text-[13px] text-ink-600 line-clamp-2">{p.description}</p>
                  )}
                </div>

                {/* Health pill */}
                <div className="flex shrink-0 items-center gap-2 rounded-full bg-cream-50 border border-ink-300/30 px-3 py-1.5">
                  <span className={`h-2 w-2 rounded-full ${healthDot(health)}`} />
                  <span className="text-[10px] uppercase tracking-[0.18em] text-ink-700">
                    {healthLabel(health)}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="mb-1.5 flex items-baseline justify-between text-[10px] uppercase tracking-[0.18em] text-ink-500">
                  <span>{done} / {total} tareas</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-cream-50">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${healthFill(health)}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}

function FilterTab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={[
        "rounded-full px-3 py-1.5 transition-all duration-300",
        active
          ? "bg-accent-lime/15 text-accent-lime ring-1 ring-accent-lime/30"
          : "text-ink-700 hover:bg-cream-200",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}
