import Link from "next/link";
import { requirePM } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { createTask } from "@/app/actions/tasks";
import { PRIORITIES, priorityLabel } from "@/lib/format";
import { ImproveBriefButton } from "@/components/ImproveBriefButton";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  const user = await requirePM();
  const [clients, teams, users] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ include: { team: true }, orderBy: [{ team: { name: "asc" } }, { handle: "asc" }] }),
  ]);

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-ink-500">
          <Link href="/admin" className="inline-flex items-center gap-1 transition hover:text-ink-900">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
            Volver
          </Link>
        </div>

        <header className="mb-10 animate-fade-up">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-ink-500">
            <span className="inline-block h-1 w-6 bg-ink-900" />
            Nueva tarea
          </div>
          <h1 className="mt-4 font-serif italic text-[clamp(36px,5vw,56px)] leading-[1] tracking-tightest text-ink-900">
            Lanza una nueva tarea al estudio.
          </h1>
        </header>

        <div className="rounded-[2rem] bg-ink-900/[0.04] p-1.5 ring-1 ring-ink-900/5 animate-fade-up">
          <form action={createTask} className="rounded-[calc(2rem-0.375rem)] bg-cream-50 p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)] space-y-5">
            <Field label="Título">
              <input
                name="title"
                required
                placeholder="¿Qué hay que hacer?"
                className="w-full bg-transparent font-serif italic text-[28px] leading-tight text-ink-900 placeholder:text-ink-300 focus:outline-none"
              />
            </Field>

            <div className="block">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[10px] uppercase tracking-[0.22em] text-ink-500">Brief</span>
                <ImproveBriefButton />
              </div>
              <textarea
                name="description"
                rows={4}
                placeholder="Contexto, links o referencias (opcional)…"
                className="w-full resize-none rounded-xl bg-ink-900/[0.04] px-3 py-2.5 text-[14px] text-ink-900 ring-1 ring-ink-900/5 placeholder:text-ink-400 focus:bg-ink-900/[0.06] focus:outline-none focus:ring-ink-900/20"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Cliente">
                <Select name="clientId" required defaultValue="">
                  <option value="" disabled>Elige un cliente…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Equipo">
                <Select name="teamId" required defaultValue="">
                  <option value="" disabled>Elige un equipo…</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Asignar a">
                <Select name="assigneeId" defaultValue="">
                  <option value="">Sin asignar</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>@{u.handle} · {u.team?.name ?? "—"}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Prioridad">
                <Select name="priority" defaultValue="MEDIUM">
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{priorityLabel(p)}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Vencimiento">
                <input
                  type="date"
                  name="dueDate"
                  className="w-full rounded-xl bg-ink-900/[0.04] px-3 py-2.5 text-[13px] text-ink-900 ring-1 ring-ink-900/5 focus:bg-ink-900/[0.06] focus:outline-none focus:ring-ink-900/20"
                />
              </Field>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="group flex items-center gap-1 rounded-full bg-ink-900 py-2.5 pl-5 pr-2 text-[12px] font-medium uppercase tracking-[0.18em] text-cream-50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-ink-800 active:scale-[0.98]"
              >
                <span>Crear tarea</span>
                <span className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-cream-50/15 transition-all duration-500 group-hover:translate-x-0.5">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-ink-500">{label}</div>
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
