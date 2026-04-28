import { requirePM } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { createTeam, deleteTeam, updateTeam, createMember, deleteMember, updateMember } from "@/app/actions/admin";
import { EditCard, EditTrigger, EditPanel } from "@/components/EditDisclosure";

export const dynamic = "force-dynamic";

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; handle?: string }>;
}) {
  const user = await requirePM();
  const sp = await searchParams;

  let errorMessage: string | null = null;
  if (sp.error === "self") {
    errorMessage = "No puedes borrarte a ti mismo.";
  } else if (sp.error === "in_use") {
    errorMessage = `@${sp.handle ?? "miembro"} tiene tareas, comentarios o transferencias asociadas. Reasigna su trabajo primero.`;
  } else if (sp.error === "team_in_use") {
    errorMessage = "Este equipo aún tiene miembros o proyectos. Muévelos antes de borrarlo.";
  }

  const [teams, users] = await Promise.all([
    prisma.team.findMany({
      include: {
        members: { orderBy: { handle: "asc" } },
        _count: { select: { tasks: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({ where: { teamId: null }, orderBy: { handle: "asc" } }),
  ]);

  return (
    <AppShell user={user}>
      <header className="mb-10 animate-fade-up">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-ink-500">
          <span className="inline-block h-1 w-6 bg-ink-900" />
          Equipos & miembros
        </div>
        <h1 className="mt-4 font-serif italic text-[clamp(36px,5vw,56px)] leading-[1] tracking-tightest text-ink-900">
          El estudio, organizado.
        </h1>
      </header>

      {errorMessage && (
        <div className="mb-8 rounded-2xl bg-accent-rust/10 px-5 py-4 ring-1 ring-accent-rust/20 animate-fade-up">
          <div className="flex items-start gap-3 text-[13px] text-accent-rust">
            <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent-rust" />
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Create forms */}
        <aside className="space-y-6 lg:col-span-1">
          <Card>
            <Label>Nuevo equipo</Label>
            <form action={createTeam} className="space-y-3">
              <Input name="name" required placeholder="ej. Brand" />
              <Submit>Crear equipo</Submit>
            </form>
          </Card>

          <Card>
            <Label>Nuevo miembro</Label>
            <form action={createMember} className="space-y-3">
              <Input name="handle" required placeholder="@handle" />
              <Input name="name" required placeholder="Nombre" />
              <Select name="teamId" defaultValue="">
                <option value="">Sin equipo</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
              <Select name="role" defaultValue="MEMBER">
                <option value="MEMBER">Miembro</option>
                <option value="PM">Project Manager</option>
              </Select>
              <Submit>Crear miembro</Submit>
            </form>
          </Card>

          {users.length > 0 && (
            <Card>
              <Label>Miembros sin equipo</Label>
              <ul className="space-y-2 text-[13px]">
                {users.map((u) => (
                  <li key={u.id} className="flex items-center justify-between">
                    <span className="font-mono text-ink-700">
                      @{u.handle}
                      {u.id === user.id && (
                        <span className="ml-2 text-[10px] uppercase tracking-[0.18em] text-ink-400">tú</span>
                      )}
                    </span>
                    {u.id !== user.id && (
                      <form action={deleteMember}>
                        <input type="hidden" name="id" value={u.id} />
                        <DeleteIcon />
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>

        {/* Teams */}
        <div className="space-y-4 lg:col-span-2">
          {teams.length === 0 && (
            <Card>
              <p className="text-sm text-ink-400">Aún no hay equipos. Crea el primero en la izquierda.</p>
            </Card>
          )}
          {teams.map((team) => (
            <div key={team.id} className="rounded-[2rem] bg-ink-900/[0.04] p-1.5 ring-1 ring-ink-900/5 animate-fade-up">
              <div className="rounded-[calc(2rem-0.375rem)] bg-cream-50 p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
                <EditCard>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-serif italic text-[28px] leading-none tracking-tightest text-ink-900">
                        {team.name}
                      </h2>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-ink-500">
                        {team.members.length} {team.members.length === 1 ? "miembro" : "miembros"} · {team._count.tasks} {team._count.tasks === 1 ? "tarea" : "tareas"}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-start gap-2">
                      <EditTrigger />
                      <form action={deleteTeam}>
                        <input type="hidden" name="id" value={team.id} />
                        <button
                          type="submit"
                          className="rounded-full bg-ink-900/[0.04] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-500 ring-1 ring-ink-900/5 transition hover:bg-accent-rust hover:text-cream-50"
                        >
                          Borrar
                        </button>
                      </form>
                    </div>
                  </div>
                  <EditPanel className="mb-6 rounded-2xl bg-ink-900/[0.03] p-4 ring-1 ring-ink-900/5">
                    <form action={updateTeam} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input type="hidden" name="id" value={team.id} />
                      <Input name="name" required defaultValue={team.name} className="sm:flex-1" />
                      <Submit small>Guardar</Submit>
                    </form>
                  </EditPanel>
                </EditCard>

                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {team.members.length === 0 && (
                    <li className="text-[13px] text-ink-400">Aún no hay miembros.</li>
                  )}
                  {team.members.map((m) => (
                    <li
                      key={m.id}
                      className="rounded-2xl bg-ink-900/[0.03] px-4 py-3 ring-1 ring-ink-900/5"
                    >
                      <EditCard>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[13px] font-medium text-ink-900">
                              {m.name}
                              {m.id === user.id && (
                                <span className="ml-2 text-[10px] uppercase tracking-[0.18em] text-ink-400">tú</span>
                              )}
                            </div>
                            <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500">
                              @{m.handle} · {m.role === "PM" ? "PM" : "Miembro"}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <EditTrigger />
                            {m.id !== user.id && (
                              <form action={deleteMember}>
                                <input type="hidden" name="id" value={m.id} />
                                <DeleteIcon />
                              </form>
                            )}
                          </div>
                        </div>
                        <EditPanel className="mt-3 rounded-xl bg-cream-50 p-3 ring-1 ring-ink-900/[0.05]">
                          <form action={updateMember} className="space-y-2">
                            <input type="hidden" name="id" value={m.id} />
                            <Input name="name" required defaultValue={m.name} placeholder="Nombre" />
                            <Select name="teamId" defaultValue={m.teamId ?? ""}>
                              <option value="">Sin equipo</option>
                              {teams.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </Select>
                            <Select name="role" defaultValue={m.role}>
                              <option value="MEMBER">Miembro</option>
                              <option value="PM">Project Manager</option>
                            </Select>
                            <Submit small>Guardar cambios</Submit>
                          </form>
                        </EditPanel>
                      </EditCard>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] bg-ink-900/[0.04] p-1.5 ring-1 ring-ink-900/5 animate-fade-up">
      <div className="rounded-[calc(2rem-0.375rem)] bg-cream-50 p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">{children}</div>
    </div>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 text-[10px] uppercase tracking-[0.22em] text-ink-500">{children}</div>;
}
function Input({ className = "", ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={`w-full rounded-xl bg-ink-900/[0.04] px-3 py-2.5 text-[13px] text-ink-900 ring-1 ring-ink-900/5 placeholder:text-ink-400 focus:bg-ink-900/[0.06] focus:outline-none focus:ring-ink-900/20 ${className}`}
    />
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
function Submit({ children, small }: { children: React.ReactNode; small?: boolean }) {
  return (
    <button
      type="submit"
      className={[
        "group flex items-center justify-between gap-1 rounded-full bg-ink-900 text-cream-50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-ink-800 active:scale-[0.98]",
        small ? "py-1.5 pl-3 pr-1 text-[10px] font-medium uppercase tracking-[0.18em]" : "w-full py-2 pl-5 pr-2 text-[12px] font-medium uppercase tracking-[0.18em]",
      ].join(" ")}
    >
      <span>{children}</span>
      <span className={`ml-2 flex items-center justify-center rounded-full bg-cream-50/15 transition-all duration-500 group-hover:translate-x-0.5 ${small ? "h-5 w-5" : "h-7 w-7"}`}>
        <svg width={small ? 9 : 11} height={small ? 9 : 11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </button>
  );
}
function DeleteIcon() {
  return (
    <button
      type="submit"
      aria-label="Delete"
      className="rounded-full bg-ink-900/[0.04] p-2 text-ink-500 ring-1 ring-ink-900/5 transition hover:bg-accent-rust hover:text-cream-50"
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
      </svg>
    </button>
  );
}
