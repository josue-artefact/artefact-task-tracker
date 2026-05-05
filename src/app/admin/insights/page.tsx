import Link from "next/link";
import { requirePM } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { formatDuration, formatDurationCompact } from "@/lib/time";

export const dynamic = "force-dynamic";

const SATURATION_HIGH = 40 * 60; // 40 h/sem = saturado
const SATURATION_LIGHT = 20 * 60; // < 20 h/sem = poca carga

function startOfWeek(): Date {
  // Lunes 00:00 local. (Convención común; ajustable.)
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=dom, 1=lun
  const diff = (day + 6) % 7; // días desde el lunes
  d.setDate(d.getDate() - diff);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default async function InsightsPage() {
  const user = await requirePM();
  const weekStart = startOfWeek();
  const monthStart = startOfMonth();

  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const [weekEntries, monthEntries, doneTasks, recentDoneTasks, allMembers] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { deletedAt: null, loggedFor: { gte: weekStart } },
      include: { user: true },
    }),
    prisma.timeEntry.findMany({
      where: { deletedAt: null, loggedFor: { gte: monthStart } },
      include: { task: { include: { client: true } } },
    }),
    // Últimas 30 tareas DONE con estimate y al menos un entry → para calibración
    prisma.task.findMany({
      where: {
        status: "DONE",
        estimatedMinutes: { not: null },
        timeEntries: { some: { deletedAt: null } },
      },
      include: {
        client: true,
        timeEntries: { where: { deletedAt: null } },
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    // Tareas DONE en últimos 30 días → para performance por miembro (throughput + on-time)
    prisma.task.findMany({
      where: {
        status: "DONE",
        updatedAt: { gte: last30Days },
        assigneeId: { not: null },
      },
      select: {
        assigneeId: true,
        dueDate: true,
        updatedAt: true,
      },
    }),
    // Todos los miembros con su info — incluso los que no han cerrado tareas
    prisma.user.findMany({
      where: { role: "MEMBER" },
      select: { id: true, handle: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // 1. Saturación por miembro (semana)
  const byUser = new Map<string, { handle: string; name: string; minutes: number }>();
  for (const e of weekEntries) {
    const u = byUser.get(e.user.id) ?? { handle: e.user.handle, name: e.user.name, minutes: 0 };
    u.minutes += e.minutes;
    byUser.set(e.user.id, u);
  }
  const saturation = [...byUser.values()].sort((a, b) => b.minutes - a.minutes);
  const maxUserMin = Math.max(SATURATION_HIGH, ...saturation.map((s) => s.minutes));

  // 2. Por cliente (mes)
  const byClient = new Map<string, { name: string; minutes: number }>();
  for (const e of monthEntries) {
    const c = byClient.get(e.task.client.id) ?? { name: e.task.client.name, minutes: 0 };
    c.minutes += e.minutes;
    byClient.set(e.task.client.id, c);
  }
  const byClientList = [...byClient.values()].sort((a, b) => b.minutes - a.minutes);
  const maxClientMin = Math.max(60, ...byClientList.map((c) => c.minutes));

  // 3. Calibración: estimado vs real en tareas done
  const calibration = doneTasks
    .map((t) => {
      const real = t.timeEntries.reduce((s, e) => s + e.minutes, 0);
      const est = t.estimatedMinutes ?? 0;
      const diff = est > 0 ? (real - est) / est : 0;
      return {
        id: t.id,
        title: t.title,
        client: t.client.name,
        estimated: est,
        real,
        diffPct: Math.round(diff * 100),
      };
    })
    .filter((t) => t.estimated > 0)
    .sort((a, b) => Math.abs(b.diffPct) - Math.abs(a.diffPct));

  // 4. Performance por miembro (últimos 30 días):
  //    - Throughput: tareas cerradas
  //    - On-time rate: % cerradas antes del dueDate (solo cuenta las que TENÍAN dueDate)
  const perfByUser = new Map<string, { completed: number; withDue: number; onTime: number }>();
  for (const t of recentDoneTasks) {
    if (!t.assigneeId) continue;
    const p = perfByUser.get(t.assigneeId) ?? { completed: 0, withDue: 0, onTime: 0 };
    p.completed++;
    if (t.dueDate) {
      p.withDue++;
      if (t.updatedAt.getTime() <= t.dueDate.getTime()) p.onTime++;
    }
    perfByUser.set(t.assigneeId, p);
  }
  const performance = allMembers
    .map((m) => {
      const p = perfByUser.get(m.id) ?? { completed: 0, withDue: 0, onTime: 0 };
      const onTimeRate = p.withDue > 0 ? Math.round((p.onTime / p.withDue) * 100) : null;
      return { ...m, completed: p.completed, withDue: p.withDue, onTime: p.onTime, onTimeRate };
    })
    .sort((a, b) => b.completed - a.completed);
  const maxCompleted = Math.max(1, ...performance.map((p) => p.completed));

  return (
    <AppShell user={user}>
      <header className="mb-10 animate-fade-up">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-ink-500">
          <span className="inline-block h-1 w-6 bg-ink-900" />
          Insights
        </div>
        <h1 className="mt-4 font-serif italic text-[clamp(36px,5vw,56px)] leading-[1] tracking-tightest text-ink-900">
          Lo que vemos en los datos.
        </h1>
        <p className="mt-3 max-w-xl text-[14px] text-ink-600">
          Visibilidad pasiva sobre cómo el equipo distribuye su tiempo. Para ajustar carga, facturar y calibrar estimaciones.
        </p>
      </header>

      <div className="space-y-10">
        {/* Saturación por miembro */}
        <section className="animate-fade-up [animation-delay:60ms]">
          <h2 className="mb-4 text-[11px] uppercase tracking-[0.22em] text-ink-500">
            Saturación por miembro · semana actual
          </h2>
          <Card>
            {saturation.length === 0 && (
              <p className="text-sm text-ink-400">Aún nadie ha logueado tiempo esta semana.</p>
            )}
            <ul className="space-y-3">
              {saturation.map((s) => {
                const pct = (s.minutes / maxUserMin) * 100;
                const isHigh = s.minutes >= SATURATION_HIGH;
                const isLight = s.minutes < SATURATION_LIGHT;
                return (
                  <li key={s.handle} className="grid grid-cols-[140px_1fr_90px] items-center gap-4">
                    <div>
                      <div className="text-[13px] font-medium text-ink-900">{s.name}</div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
                        @{s.handle}
                      </div>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-ink-900/[0.06]">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                          isHigh ? "bg-accent-rust" : isLight ? "bg-cream-300" : "bg-accent-lime"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-right text-[13px] font-medium text-ink-900">
                      {formatDuration(s.minutes)}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-5 flex items-center gap-4 text-[10px] uppercase tracking-[0.18em] text-ink-500">
              <Legend color="bg-cream-300" label="< 20 h" />
              <Legend color="bg-accent-lime" label="normal" />
              <Legend color="bg-accent-rust" label="≥ 40 h (saturado)" />
            </div>
          </Card>
        </section>

        {/* Por cliente */}
        <section className="animate-fade-up [animation-delay:120ms]">
          <h2 className="mb-4 text-[11px] uppercase tracking-[0.22em] text-ink-500">
            Por cliente · mes actual
          </h2>
          <Card>
            {byClientList.length === 0 && (
              <p className="text-sm text-ink-400">Sin tiempo logueado este mes.</p>
            )}
            <ul className="space-y-3">
              {byClientList.map((c) => {
                const pct = (c.minutes / maxClientMin) * 100;
                return (
                  <li key={c.name} className="grid grid-cols-[180px_1fr_90px] items-center gap-4">
                    <div className="font-serif italic text-[16px] text-ink-900">{c.name}</div>
                    <div className="h-2 overflow-hidden rounded-full bg-ink-900/[0.06]">
                      <div
                        className="h-full rounded-full bg-ink-900 transition-all duration-700 ease-out"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-right text-[13px] font-medium text-ink-900">
                      {formatDuration(c.minutes)}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>

        {/* Performance por miembro — últimos 30 días */}
        <section className="animate-fade-up [animation-delay:180ms]">
          <h2 className="mb-4 text-[11px] uppercase tracking-[0.22em] text-ink-500">
            Performance por miembro · últimos 30 días
          </h2>
          <Card>
            {performance.length === 0 && (
              <p className="text-sm text-ink-400">Sin miembros registrados.</p>
            )}
            <ul className="space-y-2.5">
              {performance.map((m) => {
                const completedPct = (m.completed / maxCompleted) * 100;
                const onTimeColor =
                  m.onTimeRate === null
                    ? "text-ink-400"
                    : m.onTimeRate >= 90
                      ? "text-accent-lime-dark text-ink-900"
                      : m.onTimeRate >= 50
                        ? "text-amber-700"
                        : "text-accent-rust";
                return (
                  <li key={m.id} className="grid grid-cols-[140px_1fr_70px_80px] items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-ink-900/[0.02]">
                    <div>
                      <div className="text-[13px] font-medium text-ink-900">{m.name}</div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">@{m.handle}</div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink-900/[0.06]">
                      <div
                        className="h-full rounded-full bg-ink-900 transition-all duration-700 ease-out"
                        style={{ width: `${completedPct}%` }}
                      />
                    </div>
                    <div className="text-right text-[12px] text-ink-700">
                      {m.completed} {m.completed === 1 ? "tarea" : "tareas"}
                    </div>
                    <div className={`text-right text-[12px] font-medium ${onTimeColor}`}>
                      {m.onTimeRate !== null ? `${m.onTimeRate}% on-time` : "—"}
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-ink-400">
              On-time rate: % de tareas que cerraron antes o el día del vencimiento. Solo cuenta tareas que tenían dueDate set.
            </p>
          </Card>
        </section>

        {/* Calibración */}
        <section className="animate-fade-up [animation-delay:240ms]">
          <h2 className="mb-4 text-[11px] uppercase tracking-[0.22em] text-ink-500">
            Calibración · tareas hechas con estimación
          </h2>
          <Card>
            {calibration.length === 0 && (
              <p className="text-sm text-ink-400">
                Aún no hay tareas cerradas con estimación + tiempo real para comparar.
              </p>
            )}
            <ul className="space-y-2">
              {calibration.map((c) => {
                const tone =
                  Math.abs(c.diffPct) > 100
                    ? "text-accent-rust"
                    : Math.abs(c.diffPct) > 50
                      ? "text-ink-700"
                      : "text-ink-500";
                const sign = c.diffPct > 0 ? "+" : "";
                return (
                  <li
                    key={c.id}
                    className="grid grid-cols-[1fr_auto_auto_70px] items-center gap-4 rounded-xl px-3 py-2 transition hover:bg-ink-900/[0.03]"
                  >
                    <Link href={`/task/${c.id}`} className="min-w-0">
                      <div className="truncate font-serif italic text-[15px] text-ink-900">
                        {c.title}
                      </div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500">
                        {c.client}
                      </div>
                    </Link>
                    <div className="text-right text-[11px] uppercase tracking-[0.18em] text-ink-500">
                      est {formatDurationCompact(c.estimated)}
                    </div>
                    <div className="text-right text-[11px] uppercase tracking-[0.18em] text-ink-500">
                      real {formatDurationCompact(c.real)}
                    </div>
                    <div className={`text-right text-[12px] font-medium ${tone}`}>
                      {sign}
                      {c.diffPct}%
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] bg-ink-900/[0.04] p-1.5 ring-1 ring-ink-900/5">
      <div className="rounded-[calc(2rem-0.375rem)] bg-cream-50 p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
        {children}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block h-2 w-3 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  );
}
