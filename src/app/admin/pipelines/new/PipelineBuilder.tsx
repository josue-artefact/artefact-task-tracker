"use client";

import { useState } from "react";
import { createPipeline } from "@/app/actions/pipeline";

type Client = { id: string; name: string };
type Team = { id: string; name: string };
type User = { id: string; handle: string; name: string; team: { name: string } | null };

type DraftTask = {
  id: number; // local UI ID, no se persiste
  title: string;
  teamId: string;
  assigneeId: string;
  priority: string;
  dueOffsetDays: string;
  estimatedMinutes: string;
  blockedByOrder: string; // referencia al pipelineOrder de otra tarea local
};

let nextId = 1;
function makeBlankTask(defaultTeamId: string): DraftTask {
  return {
    id: nextId++,
    title: "",
    teamId: defaultTeamId,
    assigneeId: "",
    priority: "MEDIUM",
    dueOffsetDays: "0",
    estimatedMinutes: "",
    blockedByOrder: "",
  };
}

export function PipelineBuilder({
  clients,
  teams,
  users,
}: {
  clients: Client[];
  teams: Team[];
  users: User[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  const defaultTeamId = teams[0]?.id ?? "";

  const [tasks, setTasks] = useState<DraftTask[]>([makeBlankTask(defaultTeamId)]);

  function addTask() {
    setTasks((prev) => [...prev, makeBlankTask(defaultTeamId)]);
  }
  function removeTask(id: number) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }
  function updateTask(id: number, field: keyof DraftTask, value: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  }

  return (
    <form action={createPipeline} className="space-y-8">
      {/* Pipeline-level fields */}
      <div className="rounded-[2rem] bg-ink-900/[0.04] p-1.5 ring-1 ring-ink-900/5">
        <div className="space-y-4 rounded-[calc(2rem-0.375rem)] bg-cream-50 p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
          <Field label="Nombre del pipeline">
            <input
              name="name"
              required
              placeholder="ej. Majadas — Mayo 2026"
              className="w-full bg-transparent font-serif italic text-[26px] leading-tight text-ink-900 placeholder:text-ink-300 focus:outline-none"
            />
          </Field>
          <Field label="Descripción">
            <textarea
              name="description"
              rows={2}
              placeholder="Contexto del lote (opcional)"
              className="w-full resize-none rounded-xl bg-ink-900/[0.04] px-3 py-2.5 text-[14px] text-ink-900 ring-1 ring-ink-900/5 placeholder:text-ink-400 focus:bg-ink-900/[0.06] focus:outline-none focus:ring-ink-900/20"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Cliente">
              <Select name="clientId" required defaultValue="">
                <option value="" disabled>Elige un cliente…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Fecha de arranque">
              <input
                type="date"
                name="startDate"
                required
                defaultValue={today}
                className="w-full rounded-xl bg-ink-900/[0.04] px-3 py-2.5 text-[13px] text-ink-900 ring-1 ring-ink-900/5 focus:bg-ink-900/[0.06] focus:outline-none focus:ring-ink-900/20"
              />
            </Field>
            <Field label="Guardar como template">
              <label className="flex items-center gap-2 text-[13px] text-ink-700">
                <input
                  type="checkbox"
                  name="savedAsTemplate"
                  className="h-3.5 w-3.5 rounded border-ink-900/20 accent-ink-900"
                />
                Reutilizable cada mes
              </label>
            </Field>
          </div>
        </div>
      </div>

      {/* Tasks builder */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-ink-500">
            Tareas del pipeline · {tasks.length}
          </h2>
          <button
            type="button"
            onClick={addTask}
            className="rounded-full bg-ink-900/[0.04] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-700 ring-1 ring-ink-900/5 transition hover:bg-ink-900 hover:text-cream-50"
          >
            + Agregar tarea
          </button>
        </div>

        <div className="space-y-3">
          {tasks.map((t, idx) => {
            const order = idx + 1;
            return (
              <div key={t.id} className="rounded-[1.5rem] bg-ink-900/[0.04] p-1.5 ring-1 ring-ink-900/5">
                <div className="rounded-[calc(1.5rem-0.375rem)] bg-cream-50 p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded-full bg-ink-900 px-2.5 py-0.5 text-[10px] font-medium text-cream-50">
                      #{order}
                    </span>
                    {tasks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTask(t.id)}
                        aria-label="Quitar tarea"
                        className="rounded-full bg-ink-900/[0.04] p-1.5 text-ink-500 transition hover:bg-accent-rust hover:text-cream-50"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <input
                    name={`task[${idx}][title]`}
                    value={t.title}
                    onChange={(e) => updateTask(t.id, "title", e.target.value)}
                    placeholder={`ej. ${["Propuesta de ideas de contenido", "Callsheet para aprobación", "Photoshoot mensual", "Línea gráfica", "KVs de actividades"][idx % 5]}`}
                    className="w-full bg-transparent font-serif italic text-[18px] text-ink-900 placeholder:text-ink-300 focus:outline-none"
                    required
                  />

                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <SmallSelect
                      name={`task[${idx}][teamId]`}
                      value={t.teamId}
                      onChange={(v) => updateTask(t.id, "teamId", v)}
                      label="Equipo"
                      required
                    >
                      {teams.map((tm) => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
                    </SmallSelect>

                    <SmallSelect
                      name={`task[${idx}][assigneeId]`}
                      value={t.assigneeId}
                      onChange={(v) => updateTask(t.id, "assigneeId", v)}
                      label="Asignar a"
                    >
                      <option value="">Sin asignar</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>@{u.handle} · {u.team?.name ?? "—"}</option>
                      ))}
                    </SmallSelect>

                    <SmallSelect
                      name={`task[${idx}][priority]`}
                      value={t.priority}
                      onChange={(v) => updateTask(t.id, "priority", v)}
                      label="Prioridad"
                    >
                      <option value="LOW">Baja</option>
                      <option value="MEDIUM">Media</option>
                      <option value="HIGH">Alta</option>
                      <option value="URGENT">Urgente</option>
                    </SmallSelect>
                  </div>

                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    <SmallNumberInput
                      name={`task[${idx}][dueOffsetDays]`}
                      value={t.dueOffsetDays}
                      onChange={(v) => updateTask(t.id, "dueOffsetDays", v)}
                      label="Vence (días desde arranque)"
                      placeholder="ej. 7"
                    />

                    <SmallTextInput
                      name={`task[${idx}][estimatedMinutes]`}
                      value={t.estimatedMinutes}
                      onChange={(v) => updateTask(t.id, "estimatedMinutes", v)}
                      label="Estimación (min)"
                      placeholder="ej. 240"
                      type="number"
                    />

                    <SmallSelect
                      name={`task[${idx}][blockedByOrder]`}
                      value={t.blockedByOrder}
                      onChange={(v) => updateTask(t.id, "blockedByOrder", v)}
                      label="Depende de"
                    >
                      <option value="">— ninguna</option>
                      {tasks
                        .filter((_, i) => i < idx)
                        .map((_, i) => (
                          <option key={i} value={i + 1}>Tarea #{i + 1}</option>
                        ))}
                    </SmallSelect>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button
          type="submit"
          className="group flex items-center gap-1 rounded-full bg-ink-900 py-2.5 pl-5 pr-2 text-[12px] font-medium uppercase tracking-[0.18em] text-cream-50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-ink-800 active:scale-[0.98]"
        >
          <span>Crear pipeline</span>
          <span className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-cream-50/15 transition-all duration-500 group-hover:translate-x-0.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </button>
      </div>
    </form>
  );
}

/* ---------------- helpers ---------------- */

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

function SmallSelect({
  label, value, onChange, name, required, children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  name: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-ink-500">{label}</div>
      <select
        name={name}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-ink-900/[0.04] px-2 py-1.5 text-[12px] text-ink-900 ring-1 ring-ink-900/5 focus:bg-ink-900/[0.06] focus:outline-none focus:ring-ink-900/20"
      >
        {children}
      </select>
    </label>
  );
}

function SmallTextInput({
  label, value, onChange, name, placeholder, type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  name: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-ink-500">{label}</div>
      <input
        type={type}
        name={name}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-ink-900/[0.04] px-2 py-1.5 text-[12px] text-ink-900 ring-1 ring-ink-900/5 placeholder:text-ink-400 focus:bg-ink-900/[0.06] focus:outline-none focus:ring-ink-900/20"
      />
    </label>
  );
}

function SmallNumberInput(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  name: string;
  placeholder?: string;
}) {
  return <SmallTextInput {...props} type="number" />;
}
