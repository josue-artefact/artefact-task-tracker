import Link from "next/link";
import { requirePM } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { PipelineBuilder } from "./PipelineBuilder";

export const dynamic = "force-dynamic";

export default async function NewPipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requirePM();
  const sp = await searchParams;

  const [clients, teams, users] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      include: { team: true },
      orderBy: [{ team: { name: "asc" } }, { handle: "asc" }],
    }),
  ]);

  const errorMsg =
    sp.error === "missing_fields" ? "Faltan nombre, cliente o fecha de arranque." :
    sp.error === "bad_date" ? "La fecha de arranque no es válida." :
    sp.error === "no_tasks" ? "Agrega al menos una tarea al pipeline." :
    null;

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-ink-500">
          <Link href="/admin/pipelines" className="inline-flex items-center gap-1 transition hover:text-ink-900">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
            Pipelines
          </Link>
        </div>

        <header className="mb-8 animate-fade-up">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-ink-500">
            <span className="inline-block h-1 w-6 bg-ink-900" />
            Nuevo pipeline
          </div>
          <h1 className="mt-4 font-serif italic text-[clamp(36px,5vw,56px)] leading-[1] tracking-tightest text-ink-900">
            Encadena el trabajo de un mes.
          </h1>
        </header>

        {errorMsg && (
          <div className="mb-6 rounded-2xl bg-accent-rust/10 px-4 py-3 ring-1 ring-accent-rust/20 text-[13px] text-accent-rust">
            {errorMsg}
          </div>
        )}

        <PipelineBuilder clients={clients} teams={teams} users={users} />
      </div>
    </AppShell>
  );
}
