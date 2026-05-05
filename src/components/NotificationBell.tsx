"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { markAsRead, markAllAsRead } from "@/app/actions/notifications";
import { ensurePushSubscribed, getPushStatus, type PushStatus } from "@/lib/push-client";

type Notification = {
  id: string;
  kind: string;
  message: string;
  taskId: string | null;
  readAt: string | null;
  createdAt: string;
  fromHandle: string | null;
};

type Payload = {
  notifications: Notification[];
  unreadCount: number;
};

const POLL_INTERVAL_MS = 30_000; // refresh cada 30s mientras está abierta la app

export function NotificationBell({ initialCount = 0 }: { initialCount?: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Payload>({ notifications: [], unreadCount: initialCount });
  const [loading, setLoading] = useState(false);
  const [pushStatus, setPushStatus] = useState<PushStatus>("needs-permission");
  const containerRef = useRef<HTMLDivElement>(null);

  // Check estado de push al montar (sin pedir permisos automáticamente)
  useEffect(() => {
    getPushStatus().then(setPushStatus);
  }, []);

  async function handleEnablePush() {
    setPushStatus("subscribing");
    const result = await ensurePushSubscribed();
    setPushStatus(result);
  }

  // Fetch on mount + cada 30s
  useEffect(() => {
    let cancelled = false;
    async function fetchNotifications() {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as Payload;
        if (!cancelled) setData(json);
      } catch {
        /* silent */
      }
    }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Re-fetch al abrir
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/notifications", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setData(j))
      .finally(() => setLoading(false));
  }, [open]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function handleClickNotification(n: Notification, e: React.MouseEvent) {
    e.preventDefault();
    setOpen(false);
    // Marca como leída (server action en background)
    if (!n.readAt) {
      const fd = new FormData();
      fd.set("id", n.id);
      // No await — navega de una sin esperar
      markAsRead(fd);
    }
    if (n.taskId) {
      router.push(`/task/${n.taskId}`);
    }
  }

  async function handleMarkAll() {
    await markAllAsRead();
    setData((d) => ({ ...d, unreadCount: 0, notifications: d.notifications.map((n) => ({ ...n, readAt: new Date().toISOString() })) }));
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notificaciones"
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-ink-900/[0.04] text-ink-700 ring-1 ring-ink-900/5 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-ink-900 hover:text-cream-50 hover:scale-105 active:scale-95"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {data.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent-rust px-1 text-[9px] font-bold text-cream-50 ring-2 ring-cream-50">
            {data.unreadCount > 99 ? "99+" : data.unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[360px] max-w-[92vw] origin-top-right animate-fade-up rounded-2xl bg-cream-50 p-1.5 ring-1 ring-ink-900/10 shadow-[0_10px_40px_rgba(10,9,7,0.12)]">
          <div className="rounded-xl bg-cream-100/50">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-ink-900/[0.05] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.22em] text-ink-700">
                Notificaciones
                {data.unreadCount > 0 && (
                  <span className="ml-2 text-ink-500">{data.unreadCount} no leída{data.unreadCount === 1 ? "" : "s"}</span>
                )}
              </div>
              {data.unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  className="rounded-full bg-ink-900/[0.04] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-ink-700 ring-1 ring-ink-900/5 transition hover:bg-ink-900 hover:text-cream-50"
                >
                  Marcar todas
                </button>
              )}
            </div>

            {/* Push opt-in banner */}
            {(pushStatus === "needs-permission" || pushStatus === "subscribing") && (
              <div className="border-b border-ink-900/[0.05] bg-accent-lime/[0.15] px-4 py-3">
                <p className="text-[12px] text-ink-900">
                  📣 Activa notificaciones del sistema operativo para enterarte cuando te asignen algo aunque tengas la app cerrada.
                </p>
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={pushStatus === "subscribing"}
                  className="mt-2 rounded-full bg-ink-900 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-cream-50 transition hover:bg-ink-800 disabled:opacity-50"
                >
                  {pushStatus === "subscribing" ? "Activando…" : "Activar push notifications"}
                </button>
              </div>
            )}
            {pushStatus === "denied" && (
              <div className="border-b border-ink-900/[0.05] bg-accent-rust/[0.08] px-4 py-3">
                <p className="text-[12px] text-ink-700">
                  Las notificaciones están bloqueadas. Actívalas en la configuración de tu navegador y recarga.
                </p>
              </div>
            )}
            {pushStatus === "subscribed" && data.unreadCount === 0 && data.notifications.length === 0 && (
              <div className="border-b border-ink-900/[0.05] px-4 py-2 text-center">
                <p className="text-[10px] uppercase tracking-[0.18em] text-ink-400">
                  ✓ Push activadas
                </p>
              </div>
            )}

            {/* Lista */}
            <div className="max-h-[400px] overflow-y-auto">
              {loading && data.notifications.length === 0 && (
                <p className="px-4 py-6 text-center text-[12px] text-ink-400">Cargando…</p>
              )}
              {!loading && data.notifications.length === 0 && (
                <p className="px-4 py-8 text-center text-[12px] text-ink-400">
                  Sin notificaciones. Estás al día.
                </p>
              )}
              <ul className="divide-y divide-ink-900/[0.04]">
                {data.notifications.map((n) => {
                  const unread = !n.readAt;
                  return (
                    <li key={n.id}>
                      {n.taskId ? (
                        <Link
                          href={`/task/${n.taskId}`}
                          onClick={(e) => handleClickNotification(n, e)}
                          className={`flex items-start gap-3 px-4 py-3 transition hover:bg-ink-900/[0.02] ${unread ? "bg-accent-lime/[0.08]" : ""}`}
                        >
                          <NotificationDot kind={n.kind} unread={unread} />
                          <div className="min-w-0 flex-1">
                            <p className={`text-[13px] leading-snug ${unread ? "text-ink-900" : "text-ink-600"}`}>
                              {n.message}
                            </p>
                            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-ink-400">
                              {timeAgo(n.createdAt)}
                            </p>
                          </div>
                        </Link>
                      ) : (
                        <div className={`flex items-start gap-3 px-4 py-3 ${unread ? "bg-accent-lime/[0.08]" : ""}`}>
                          <NotificationDot kind={n.kind} unread={unread} />
                          <div className="min-w-0 flex-1">
                            <p className={`text-[13px] leading-snug ${unread ? "text-ink-900" : "text-ink-600"}`}>
                              {n.message}
                            </p>
                            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-ink-400">
                              {timeAgo(n.createdAt)}
                            </p>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationDot({ kind, unread }: { kind: string; unread: boolean }) {
  const color =
    kind === "task_assigned"
      ? "bg-accent-lime"
      : kind === "task_transferred_from_me"
        ? "bg-amber-500"
        : kind === "task_commented"
          ? "bg-ink-900"
          : "bg-ink-400";
  return (
    <span className={`mt-1.5 inline-flex h-2 w-2 shrink-0 rounded-full ${unread ? color : "bg-ink-300"}`} />
  );
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}
