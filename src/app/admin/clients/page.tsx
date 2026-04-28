import Link from "next/link";
import { requirePM } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { createClient, deleteClient, updateClient } from "@/app/actions/admin";
import { EditCard, EditTrigger, EditPanel } from "@/components/EditDisclosure";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requirePM();
  const sp = await searchParams;

  const errorMessage =
    sp.error === "client_in_use"
      ? "Este cliente aún tiene tareas asociadas. Muévelas o bórralas primero."
      : null;

  const clients = await prisma.client.findMany({
    include: {
      tasks: {
        include: { team: true, assignee: true },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <AppShell user={user}>
      <header className="mb-10 animate-fade-up">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-ink-500">
          <span className="inline-block h-1 w-6 bg-ink-900" />
          Clientes
        </div>
        <h1 className="mt-4 font-serif italic text-[clamp(36px,5vw,56px)] leading-[1] tracking-tightest text-ink-900">
          Para quién creamos.
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
        {/* Create */}
        <aside className="lg:col-span-1">
          <Card>
            <Label>Nuevo cliente</Label>
            <form action={createClient} className="space-y-3">
              <Input name="name" required placeholder="Nombre del cliente" />
              <Textarea name="description" placeholder="Brief (opcional)" rows={3} />
              <Submit>Crear cliente</Submit>
            </form>
          </Card>
        </aside>

        {/* List */}
        <div className="grid gap-4 lg:col-span-2">
          {clients.length === 0 && (
            <Card>
              <p className="text-sm text-ink-400">Aún no hay clientes. Crea el primero en la izquierda.</p>
            </Card>
          )}

          {clients.map((c) => {
            const open = c.tasks.filter((t) => t.status !== "DONE").length;
            return (
              <div key={c.id} className="rounded-[2rem] bg-ink-900/[0.04] p-1.5 ring-1 ring-ink-900/5 animate-fade-up">
                <div className="rounded-[calc(2rem-0.375rem)] bg-cream-50 p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
                  <EditCard>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500">
                          {c.tasks.length} {c.tasks.length === 1 ? "tarea" : "tareas"} · {open} {open === 1 ? "abierta" : "abiertas"}
                        </div>
                        <h2 className="mt-1 font-serif italic text-[28px] leading-tight tracking-tightest text-ink-900">
                          {c.name}
                        </h2>
                        {c.description && (
                          <p className="mt-2 max-w-xl text-[14px] text-ink-600">{c.description}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-start gap-2">
                        <EditTrigger />
                        <form action={deleteClient}>
                          <input type="hidden" name="id" value={c.id} />
                          <button
                            type="submit"
                            className="rounded-full bg-ink-900/[0.04] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-500 ring-1 ring-ink-900/5 transition hover:bg-accent-rust hover:text-cream-50"
                          >
                            Borrar
                          </button>
                        </form>
                      </div>
                    </div>
                    <EditPanel className="mt-4 rounded-2xl bg-ink-900/[0.03] p-4 ring-1 ring-ink-900/5">
                      <form action={updateClient} className="space-y-2">
                        <input type="hidden" name="id" value={c.id} />
                        <Input name="name" required defaultValue={c.name} placeholder="Nombre" />
                        <Textarea name="description" defaultValue={c.description ?? ""} placeholder="Brief (opcional)" rows={3} />
                        <div className="flex justify-end">
                          <Submit small>Guardar</Submit>
                        </div>
                      </form>
                    </EditPanel>
                  </EditCard>

                  {c.tasks.length > 0 && (
                    <ul className="mt-5 grid gap-1.5">
                      {c.tasks.slice(0, 6).map((t) => (
                        <li key={t.id}>
                          <Link
                            href={`/task/${t.id}`}
                            className="flex items-center justify-between rounded-xl px-3 py-2 text-[13px] text-ink-700 transition hover:bg-ink-900/[0.03]"
                          >
                            <div className="min-w-0 flex-1">
                              <span className={`font-serif italic text-[15px] ${t.status === "DONE" ? "text-ink-400 line-through decoration-ink-300" : "text-ink-900"}`}>
                                {t.title}
                              </span>
                              <span className="ml-2 text-[10px] uppercase tracking-[0.18em] text-ink-500">
                                {t.team.name}
                              </span>
                            </div>
                            <span className="ml-3 shrink-0 font-mono text-[11px] text-ink-500">
                              {t.assignee ? `@${t.assignee.handle}` : "—"}
                            </span>
                          </Link>
                        </li>
                      ))}
                      {c.tasks.length > 6 && (
                        <li className="px-3 text-[10px] uppercase tracking-[0.18em] text-ink-400">
                          + {c.tasks.length - 6} más
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
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
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl bg-ink-900/[0.04] px-3 py-2.5 text-[13px] text-ink-900 ring-1 ring-ink-900/5 placeholder:text-ink-400 focus:bg-ink-900/[0.06] focus:outline-none focus:ring-ink-900/20"
    />
  );
}
function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full resize-none rounded-xl bg-ink-900/[0.04] px-3 py-2.5 text-[13px] text-ink-900 ring-1 ring-ink-900/5 placeholder:text-ink-400 focus:bg-ink-900/[0.06] focus:outline-none focus:ring-ink-900/20"
    />
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
