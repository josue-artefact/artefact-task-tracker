"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PriorityPill, StatusPill } from "@/components/PriorityPill";
import { formatDate, formatRelative, isOverdue } from "@/lib/format";
import { deleteTask, bulkDeleteTasks, bulkAssignTasks } from "@/app/actions/tasks";

export type AdminTask = {
  id: string;
  title: string;
  priority: string;
  status: string;
  dueDate: Date | null;
  updatedAt: Date;
  assignee: { handle: string } | null;
  client: { name: string };
  team: { name: string };
};

export type AssigneeOption = {
  id: string;
  handle: string;
  team: { name: string } | null;
};

type SortKey = "title" | "client" | "team" | "assignee" | "priority" | "status" | "updated";
type SortDir = "asc" | "desc";

type Props = {
  tasks: AdminTask[];
  users: AssigneeOption[];
  query: string;
  sortKey: SortKey;
  sortDir: SortDir;
};

function buildSortUrl(query: string, nextSort: SortKey, nextDir: SortDir): string {
  const sp = new URLSearchParams();
  if (query) sp.set("q", query);
  if (nextSort !== "updated") sp.set("sort", nextSort);
  if (nextDir !== "desc") sp.set("dir", nextDir);
  const qs = sp.toString();
  return qs ? `/admin?${qs}` : "/admin";
}

const COLUMNS: {
  key: SortKey;
  label: string;
  /** Tailwind responsive class para mostrar/esconder en mobile */
  responsive?: string;
}[] = [
  { key: "title",    label: "Tarea" },
  { key: "client",   label: "Cliente",   responsive: "hidden lg:table-cell" },
  { key: "team",     label: "Equipo",    responsive: "hidden lg:table-cell" },
  { key: "assignee", label: "Asignado",  responsive: "hidden md:table-cell" },
  { key: "priority", label: "Prioridad" },
  { key: "status",   label: "Estado",    responsive: "hidden sm:table-cell" },
  { key: "updated",  label: "Actualizada", responsive: "hidden xl:table-cell" },
];

export function AdminTaskTable({ tasks, users, query, sortKey, sortDir }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allIds = useMemo(() => tasks.map((t) => t.id), [tasks]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = !allSelected && selected.size > 0;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  }
  function clearSelection() {
    setSelected(new Set());
  }

  return (
    <>
      <div className="rounded-[2rem] bg-ink-900/[0.04] p-1.5 ring-1 ring-ink-900/5">
        <div className="overflow-x-auto rounded-[calc(2rem-0.375rem)] bg-cream-50">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-ink-900/5 text-[10px] uppercase tracking-[0.18em] text-ink-500">
              <tr>
                <th className="w-10 py-3 pl-4 pr-2 sm:pl-6">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleAll}
                    aria-label="Seleccionar todas"
                    className="h-3.5 w-3.5 rounded border-ink-900/20 accent-ink-900"
                  />
                </th>
                {COLUMNS.map((col) => {
                  const nextDir: SortDir =
                    sortKey === col.key && sortDir === "asc" ? "desc" : "asc";
                  return (
                    <th key={col.key} className={`px-3 py-3 font-medium ${col.responsive ?? ""}`}>
                      <SortHeader
                        label={col.label}
                        active={sortKey === col.key}
                        dir={sortDir}
                        href={buildSortUrl(query, col.key, nextDir)}
                      />
                    </th>
                  );
                })}
                <th className="py-3 pl-3 pr-4 font-medium sm:pr-6" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-900/5">
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-sm text-ink-400">
                    {query ? `No hay tareas que coincidan con "${query}".` : "Aún no hay tareas. Crea una para empezar."}
                  </td>
                </tr>
              )}
              {tasks.map((t) => {
                const isSelected = selected.has(t.id);
                const overdue = t.dueDate && isOverdue(t.dueDate) && t.status !== "DONE";
                return (
                  <tr
                    key={t.id}
                    className={`group transition-colors ${isSelected ? "bg-accent-lime/20" : "hover:bg-ink-900/[0.02]"}`}
                  >
                    <td className="py-3.5 pl-4 pr-2 sm:pl-6">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(t.id)}
                        aria-label="Seleccionar"
                        className="h-3.5 w-3.5 rounded border-ink-900/20 accent-ink-900"
                      />
                    </td>
                    <td className="px-3 py-3.5">
                      <Link href={`/task/${t.id}`} className="block">
                        <span className="font-serif italic text-[16px] text-ink-900 transition group-hover:text-ink-700">
                          {t.title}
                        </span>
                        {/* Meta visible solo en mobile (lg-hidden) — muestra cliente · equipo cuando las columnas están ocultas */}
                        <span className="mt-0.5 block text-[10px] uppercase tracking-[0.18em] text-ink-500 lg:hidden">
                          {t.client.name} · {t.team.name}
                        </span>
                      </Link>
                    </td>
                    <td className="hidden px-3 py-3.5 text-[13px] text-ink-700 lg:table-cell">{t.client.name}</td>
                    <td className="hidden px-3 py-3.5 text-[13px] text-ink-700 lg:table-cell">{t.team.name}</td>
                    <td className="hidden px-3 py-3.5 text-ink-700 md:table-cell">
                      {t.assignee ? <span className="font-mono">@{t.assignee.handle}</span> : <span className="text-ink-400">—</span>}
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex flex-col gap-1">
                        <PriorityPill priority={t.priority} />
                        {overdue && (
                          <span className="inline-flex items-center gap-1 self-start rounded-full bg-accent-rust/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.18em] text-accent-rust">
                            Vencida {formatDate(t.dueDate!)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="hidden px-3 py-3.5 sm:table-cell"><StatusPill status={t.status} /></td>
                    <td className="hidden px-3 py-3.5 text-[10px] uppercase tracking-[0.18em] text-ink-400 xl:table-cell">
                      {formatRelative(t.updatedAt)}
                    </td>
                    <td className="py-3.5 pl-3 pr-4 sm:pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/task/${t.id}`}
                          className="rounded-full bg-ink-900/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-ink-700 ring-1 ring-ink-900/5 transition hover:bg-ink-900 hover:text-cream-50"
                        >
                          Abrir
                        </Link>
                        <form action={deleteTask}>
                          <input type="hidden" name="id" value={t.id} />
                          <button
                            type="submit"
                            aria-label="Borrar tarea"
                            className="rounded-full bg-ink-900/[0.04] p-2 text-ink-500 ring-1 ring-ink-900/5 transition hover:bg-accent-rust hover:text-cream-50"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
                            </svg>
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 animate-fade-up">
          <div className="rounded-full bg-ink-900/10 p-1.5 ring-1 ring-ink-900/10 backdrop-blur-xl shadow-[0_10px_40px_rgba(10,9,7,0.18)]">
            <div className="flex items-center gap-2 rounded-full bg-ink-900 px-4 py-2 text-cream-50">
              <span className="font-serif italic text-[18px] leading-none">{selected.size}</span>
              <span className="text-[11px] uppercase tracking-[0.18em] opacity-80">
                seleccionada{selected.size === 1 ? "" : "s"}
              </span>

              <div className="mx-2 h-5 w-px bg-cream-50/15" />

              {/* Bulk reassign */}
              <form
                action={async (fd) => {
                  await bulkAssignTasks(fd);
                  clearSelection();
                }}
                className="flex items-center gap-1"
              >
                {Array.from(selected).map((id) => (
                  <input key={id} type="hidden" name="ids" value={id} />
                ))}
                <select
                  name="assigneeId"
                  defaultValue=""
                  className="rounded-full bg-cream-50/10 px-3 py-1.5 text-[11px] text-cream-50 ring-1 ring-cream-50/10 focus:outline-none"
                  aria-label="Reasignar a"
                >
                  <option value="" disabled className="bg-ink-900">
                    Reasignar a…
                  </option>
                  <option value="" className="bg-ink-900">Sin asignar</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id} className="bg-ink-900">
                      @{u.handle} · {u.team?.name ?? "—"}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-full bg-cream-50/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition hover:bg-cream-50 hover:text-ink-900"
                >
                  Aplicar
                </button>
              </form>

              <div className="mx-2 h-5 w-px bg-cream-50/15" />

              {/* Bulk delete */}
              <form
                action={async (fd) => {
                  await bulkDeleteTasks(fd);
                  clearSelection();
                }}
              >
                {Array.from(selected).map((id) => (
                  <input key={id} type="hidden" name="ids" value={id} />
                ))}
                <button
                  type="submit"
                  className="rounded-full bg-accent-rust/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-cream-50 ring-1 ring-accent-rust/30 transition hover:bg-accent-rust"
                >
                  Borrar
                </button>
              </form>

              <div className="mx-2 h-5 w-px bg-cream-50/15" />

              <button
                type="button"
                onClick={clearSelection}
                className="rounded-full px-2 py-1.5 text-[11px] uppercase tracking-[0.18em] opacity-70 transition hover:opacity-100"
                aria-label="Limpiar selección"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SortHeader({
  label,
  active,
  dir,
  href,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  href: string;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`inline-flex items-center gap-1 transition hover:text-ink-900 ${active ? "text-ink-900" : "text-ink-500"}`}
    >
      <span>{label}</span>
      <span className={`text-[8px] transition-opacity ${active ? "opacity-100" : "opacity-30"}`}>
        {active ? (dir === "asc" ? "▲" : "▼") : "▲▼"}
      </span>
    </Link>
  );
}
