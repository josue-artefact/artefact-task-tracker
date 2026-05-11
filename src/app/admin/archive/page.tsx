import Link from "next/link";
import { requirePM } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { PriorityPill } from "@/components/PriorityPill";
import { formatRelative } from "@/lib/format";
import { unarchiveTask } from "@/app/actions/tasks";

export const dynamic = "force-dynamic";

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requirePM();
  const sp = await searchParams;
  const query = (sp.q || "").trim();

  const tasks = await prisma.task.findMany({
    where: {
      archivedAt: { not: null },
      ...(query
        ? {
            OR: [
              { title: { contains: query } },
              { client: { name: { contains: query } } },
              { team: { name: { contains: query } } },
              { assignee: { handle: { contains: query } } },
            ],
          }
        : {}),
    },
    include: {
      client: true,
      team: true,
      assignee: true,
    },
    orderBy: { archivedAt: "desc" },
  });

  return (
    <AppShell user={user}>
      <div className="mb-6 flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-ink-500">
        <Link href="/admin" className="inline-flex items-center gap-2 transition hover:text-ink-900">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          Resumen
        </Link>
      </div>

      <header className="mb-8 animate-fade-up">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-ink-500">
          <span className="inline-block h-1 w-6 bg-accent-lime" />
          Archivo
        </div>
        <h1 className="mt-3 font-semibold tracking-tight text-[clamp(28px,4vw,44px)] leading-[1.05] text-ink-900">
          Tareas guardadas.
        </h1>
        <p className="mt-3 max-w-xl text-[14px] text-ink-600">
          Las tareas archivadas quedan fuera de los listados activos pero preservan todo su historial (comentarios, tiempo registrado, transferencias). Se pueden desarchivar en cualquier momento.
        </p>
      </header>

      {/* Search */}
      <form method="GET" action="/admin/archive" className="mb-6 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-full bg-cream-50 border border-ink-300/40 px-4 py-2 transition-colors focus-within:border-accent-lime/40">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-ink-500">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            name="q"
            defaultValue={query}
            placeholder="Buscar en archivadas…"
            className="flex-1 bg-transparent text-[13px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
          />
        </div>
        {query && (
          <Link
            href="/admin/archive"
            className="rounded-full bg-cream-100 border border-ink-300/40 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-500 transition hover:bg-cream-200 hover:text-ink-900"
          >
            Limpiar
          </Link>
        )}
      </form>

      {/* Header de la lista */}
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-[11px] uppercase tracking-[0.22em] text-ink-500">
          {query ? `Resultados: ${tasks.length}` : `${tasks.length} tarea${tasks.length === 1 ? "" : "s"} archivada${tasks.length === 1 ? "" : "s"}`}
        </h2>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-2xl bg-cream-100 border border-ink-300/30 px-8 py-14 text-center">
          <p className="font-semibold tracking-tight text-xl text-ink-700">
            {query ? "Sin resultados." : "Aún no hay archivadas."}
          </p>
          <p className="mt-2 text-sm text-ink-500">
            {query
              ? "Prueba con otro término."
              : "Cuando archives una tarea terminada, aparecerá aquí."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li
              key={t.id}
              className="rounded-xl bg-cream-100 border border-ink-300/30 px-5 py-4 transition hover:border-ink-300/60 animate-fade-up"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link href={`/task/${t.id}`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-500">
                    <span>{t.client.name}</span>
                    <span className="opacity-30">·</span>
                    <span>{t.team.name}</span>
                    {t.assignee && (
                      <>
                        <span className="opacity-30">·</span>
                        <span className="font-mono">@{t.assignee.handle}</span>
                      </>
                    )}
                  </div>
                  <h3 className="mt-1 truncate font-semibold tracking-tight text-[17px] leading-tight text-ink-900">
                    {t.title}
                  </h3>
                </Link>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <PriorityPill priority={t.priority} />
                  <span className="rounded-full bg-cream-50 border border-ink-300/30 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-ink-500">
                    archivada {t.archivedAt ? formatRelative(t.archivedAt) : ""}
                  </span>
                  <form action={unarchiveTask}>
                    <input type="hidden" name="id" value={t.id} />
                    <button
                      type="submit"
                      className="rounded-full bg-accent-lime px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-cream-50 transition hover:bg-accent-lime/85 active:scale-[0.98]"
                    >
                      Desarchivar
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
