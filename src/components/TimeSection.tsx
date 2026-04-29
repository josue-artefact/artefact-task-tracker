import { logTime, deleteTimeEntry, updateTimeEntry } from "@/app/actions/time";
import { formatDuration, formatDurationCompact, dateToInputValue } from "@/lib/time";
import { formatDate, formatRelative } from "@/lib/format";
import { EditCard, EditTrigger, EditPanel } from "@/components/EditDisclosure";

const EDIT_LOCK_MS = 24 * 60 * 60 * 1000;

type Entry = {
  id: string;
  minutes: number;
  note: string | null;
  loggedFor: Date;
  createdAt: Date;
  user: { id: string; handle: string; name: string };
};

type Props = {
  taskId: string;
  taskStatus: string;
  estimatedMinutes: number | null;
  entries: Entry[];
  currentUserId: string;
  isPM: boolean;
  /** Mensaje de error a mostrar (viene de ?time_error=... en searchParams) */
  errorCode?: string | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  bad_duration: "Formato no válido. Usa: 30, 1.5h, 1h30, 90m, 2:15.",
  too_long: "Una sola entrada no puede exceder 16 h.",
  bad_date: "Fecha inválida.",
  future_date: "No puedes loguear tiempo en el futuro.",
  too_old: "No puedes loguear tiempo de hace más de 14 días.",
  no_task: "La tarea ya no existe.",
  task_done: "Esta tarea está cerrada. Pídele al PM que la reabra para registrar tiempo.",
  day_cap: "Llegaste al máximo de 16 h logueadas en ese día.",
  locked: "Esta entrada tiene más de 24 h y ya no se puede editar/borrar.",
  not_yours: "No puedes editar entradas de otra persona.",
  bad_estimate: "Estimación inválida. Usa: 4h, 90m, 1h30.",
};

export function TimeSection({
  taskId,
  taskStatus,
  estimatedMinutes,
  entries,
  currentUserId,
  isPM,
  errorCode,
}: Props) {
  const totalMinutes = entries.reduce((s, e) => s + e.minutes, 0);
  const myMinutes = entries
    .filter((e) => e.user.id === currentUserId)
    .reduce((s, e) => s + e.minutes, 0);

  const canLog = isPM || taskStatus !== "DONE";
  const today = dateToInputValue(new Date());
  const error = errorCode ? ERROR_MESSAGES[errorCode] ?? errorCode : null;

  // Ordenar entradas por loggedFor desc, luego createdAt desc
  const sorted = [...entries].sort((a, b) => {
    const d = b.loggedFor.getTime() - a.loggedFor.getTime();
    if (d !== 0) return d;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return (
    <div className="rounded-[2rem] bg-ink-900/[0.04] p-1.5 ring-1 ring-ink-900/5 animate-fade-up">
      <div className="rounded-[calc(2rem-0.375rem)] bg-cream-50 p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]">
        <div className="mb-5 text-[10px] uppercase tracking-[0.22em] text-ink-500">Tiempo</div>

        {/* Stats top */}
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          {estimatedMinutes !== null && (
            <Stat label="Estimado" value={formatDuration(estimatedMinutes)} />
          )}
          <Stat label="Logueado" value={formatDuration(totalMinutes)} />
          <Stat label="Tu tiempo" value={formatDuration(myMinutes)} />
        </div>

        {/* Progress bar si hay estimate */}
        {estimatedMinutes && estimatedMinutes > 0 && (
          <ProgressBar logged={totalMinutes} estimated={estimatedMinutes} />
        )}

        {/* Form de log */}
        {canLog ? (
          <form action={logTime} className="mt-5 rounded-2xl bg-ink-900/[0.03] p-3 ring-1 ring-ink-900/5">
            <input type="hidden" name="taskId" value={taskId} />
            <div className="grid gap-2 sm:grid-cols-[140px_1fr_140px_auto]">
              <Input
                name="duration"
                placeholder="ej. 1h30, 45m, 2:15"
                aria-label="Duración"
                required
              />
              <Input
                name="note"
                placeholder="Nota (opcional) — ej. 'review con cliente'"
                aria-label="Nota"
              />
              <Input type="date" name="loggedFor" defaultValue={today} max={today} aria-label="Fecha" />
              <SubmitButton>Loguear</SubmitButton>
            </div>
            {error && (
              <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-accent-rust">
                {error}
              </p>
            )}
          </form>
        ) : (
          <p className="mt-5 rounded-2xl bg-ink-900/[0.03] px-4 py-3 text-[13px] text-ink-500 ring-1 ring-ink-900/5">
            Esta tarea está marcada como <strong>Hecho</strong>. Solo el PM puede registrar tiempo retroactivo.
          </p>
        )}

        {/* Lista de entries */}
        {sorted.length > 0 && (
          <ul className="mt-5 grid gap-1.5">
            {sorted.map((e) => {
              const isMine = e.user.id === currentUserId;
              const isLocked = Date.now() - new Date(e.createdAt).getTime() > EDIT_LOCK_MS;
              const canModify = isPM || (isMine && !isLocked);
              return (
                <li key={e.id}>
                  <EntryRow
                    entry={e}
                    today={today}
                    canModify={canModify}
                    isMine={isMine}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------------- Subcomponents ---------------- */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-ink-900/[0.04] px-4 py-3 ring-1 ring-ink-900/5">
      <div className="text-[10px] uppercase tracking-[0.22em] text-ink-500">{label}</div>
      <div className="mt-1 font-serif italic text-[22px] leading-none tracking-tightest text-ink-900">
        {value}
      </div>
    </div>
  );
}

function ProgressBar({ logged, estimated }: { logged: number; estimated: number }) {
  const pct = Math.min(100, Math.round((logged / estimated) * 100));
  const overrun = logged > estimated;
  const overrunPct = Math.round((logged / estimated) * 100);
  return (
    <div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-ink-900/[0.06]">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            overrun ? "bg-accent-rust" : "bg-accent-lime"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] uppercase tracking-[0.18em] text-ink-500">
        <span>{pct}% del estimado</span>
        {overrun && (
          <span className="text-accent-rust">+{overrunPct - 100}% sobre estimado</span>
        )}
      </div>
    </div>
  );
}

function EntryRow({
  entry,
  today,
  canModify,
  isMine,
}: {
  entry: Entry;
  today: string;
  canModify: boolean;
  isMine: boolean;
}) {
  const fmtDate = formatDate(entry.loggedFor);
  return (
    <div className="rounded-2xl bg-ink-900/[0.03] px-4 py-3 ring-1 ring-ink-900/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[13px] text-ink-900">
            <span className="font-mono font-medium">{formatDurationCompact(entry.minutes)}</span>
            <span className="opacity-30">·</span>
            <span className="text-ink-700">{fmtDate}</span>
            <span className="opacity-30">·</span>
            <span className="font-mono text-[11px] text-ink-500">@{entry.user.handle}{isMine ? " (tú)" : ""}</span>
          </div>
          {entry.note && (
            <p className="mt-1 text-[13px] italic text-ink-600">"{entry.note}"</p>
          )}
          <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-ink-400">
            registrado {formatRelative(entry.createdAt)}
          </div>
        </div>
        {canModify && (
          <div className="flex shrink-0 items-center gap-1.5">
            <EditCard>
              <EditTrigger />
              <EditPanel className="mt-3 rounded-xl bg-cream-50 p-3 ring-1 ring-ink-900/5">
                <form action={updateTimeEntry} className="space-y-2">
                  <input type="hidden" name="id" value={entry.id} />
                  <div className="grid grid-cols-[1fr_140px] gap-2">
                    <Input
                      name="duration"
                      defaultValue={formatDurationCompact(entry.minutes)}
                      placeholder="1h30"
                      required
                    />
                    <Input
                      type="date"
                      name="loggedFor"
                      defaultValue={dateToInputValue(entry.loggedFor)}
                      max={today}
                    />
                  </div>
                  <Input name="note" defaultValue={entry.note ?? ""} placeholder="Nota (opcional)" />
                  <div className="flex justify-end">
                    <SubmitButton small>Guardar</SubmitButton>
                  </div>
                </form>
              </EditPanel>
            </EditCard>
            <form action={deleteTimeEntry}>
              <input type="hidden" name="id" value={entry.id} />
              <button
                type="submit"
                aria-label="Borrar entrada"
                className="rounded-full bg-ink-900/[0.04] p-2 text-ink-500 ring-1 ring-ink-900/5 transition hover:bg-accent-rust hover:text-cream-50"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
                </svg>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function Input({ className = "", ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={`w-full rounded-xl bg-cream-50 px-3 py-2 text-[13px] text-ink-900 ring-1 ring-ink-900/5 placeholder:text-ink-400 focus:bg-cream-50 focus:outline-none focus:ring-ink-900/20 ${className}`}
    />
  );
}

function SubmitButton({ children, small }: { children: React.ReactNode; small?: boolean }) {
  return (
    <button
      type="submit"
      className={[
        "group flex items-center justify-between gap-1 rounded-full bg-ink-900 text-cream-50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-ink-800 active:scale-[0.98]",
        small ? "py-1.5 pl-3 pr-1 text-[10px] font-medium uppercase tracking-[0.18em]" : "py-2 pl-5 pr-2 text-[11px] font-medium uppercase tracking-[0.18em]",
      ].join(" ")}
    >
      <span>{children}</span>
      <span className={`ml-2 flex items-center justify-center rounded-full bg-cream-50/15 transition-all duration-500 group-hover:translate-x-0.5 ${small ? "h-5 w-5" : "h-6 w-6"}`}>
        <svg width={small ? 9 : 10} height={small ? 9 : 10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </button>
  );
}
