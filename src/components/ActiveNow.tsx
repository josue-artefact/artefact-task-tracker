import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatRelative } from "@/lib/format";

const STALE_HOURS = 8;

/**
 * Tira "En vivo · ahora" — quién está activo en qué tarea ahora mismo.
 *
 * Usuarios con activeTaskId fijo y activeSince dentro de las últimas 8h
 * se muestran arriba (con dot lima). El resto abajo, atenuados.
 */
export async function ActiveNow() {
  const users = await prisma.user.findMany({
    include: {
      activeTask: { include: { client: true } },
    },
    orderBy: [{ name: "asc" }],
  });

  const cutoff = Date.now() - STALE_HOURS * 60 * 60 * 1000;

  const active = users.filter(
    (u) => u.activeTask && u.activeSince && u.activeSince.getTime() > cutoff,
  );
  const inactive = users.filter((u) => !active.includes(u));

  // Sort actives by most recent activeSince first
  active.sort((a, b) => b.activeSince!.getTime() - a.activeSince!.getTime());

  return (
    <section className="mb-8 animate-fade-up">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-[11px] uppercase tracking-[0.22em] text-ink-500">
          En vivo · ahora
        </h2>
        <span className="text-[10px] uppercase tracking-[0.22em] text-ink-400">
          {active.length} activo{active.length === 1 ? "" : "s"} · {inactive.length} sin actividad
        </span>
      </div>

      <div className="rounded-[2rem] bg-ink-900/[0.04] p-1.5 ring-1 ring-ink-900/5">
        <div className="rounded-[calc(2rem-0.375rem)] bg-cream-50 px-6 py-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]">
          {active.length === 0 && inactive.length === 0 && (
            <p className="text-sm text-ink-400">Sin miembros aún.</p>
          )}

          <ul className="space-y-2.5">
            {active.map((u) => (
              <li
                key={u.id}
                className="grid grid-cols-[140px_1fr_auto] items-center gap-4 rounded-xl px-2 py-1.5 transition hover:bg-ink-900/[0.02]"
              >
                <div className="flex items-center gap-2">
                  <span className="relative inline-flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-lime opacity-50" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-lime" />
                  </span>
                  <div>
                    <div className="text-[13px] font-medium text-ink-900">{u.name}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
                      @{u.handle}
                    </div>
                  </div>
                </div>
                <Link
                  href={`/task/${u.activeTask!.id}`}
                  className="min-w-0 truncate transition hover:text-ink-700"
                >
                  <span className="font-serif italic text-[16px] text-ink-900">
                    {u.activeTask!.title}
                  </span>
                  <span className="ml-2 text-[10px] uppercase tracking-[0.18em] text-ink-500">
                    {u.activeTask!.client.name}
                  </span>
                </Link>
                <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-ink-500">
                  {formatRelative(u.activeSince!)}
                </span>
              </li>
            ))}

            {inactive.map((u) => (
              <li
                key={u.id}
                className="grid grid-cols-[140px_1fr_auto] items-center gap-4 rounded-xl px-2 py-1.5 opacity-50"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full ring-1 ring-ink-300" />
                  <div>
                    <div className="text-[13px] text-ink-700">{u.name}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
                      @{u.handle}
                    </div>
                  </div>
                </div>
                <span className="text-[13px] text-ink-400">—</span>
                <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-ink-300">
                  sin actividad
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
