import Link from "next/link";
import { ArtefactMark } from "./ArtefactMark";
import { logoutAction } from "@/app/actions/auth";

type Props = {
  user: { handle: string; name: string; role: string; team?: { name: string } | null };
  children: React.ReactNode;
};

export function AppShell({ user, children }: Props) {
  const isPM = user.role === "PM";
  return (
    <div className="relative min-h-[100dvh] bg-cream-50">
      {/* Floating glass nav island */}
      <header className="sticky top-0 z-40 flex justify-center px-4 pt-6">
        <nav
          className="
            flex w-full max-w-5xl items-center justify-between gap-4
            rounded-full p-1.5 ring-1 ring-ink-900/10
            bg-cream-50/70 backdrop-blur-xl
            shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_8px_30px_rgba(10,9,7,0.04)]
          "
        >
          <Link href={isPM ? "/admin" : "/inbox"} className="flex items-center gap-3 pl-2">
            <ArtefactMark size={36} />
            <span className="hidden font-serif italic text-[15px] tracking-tight text-ink-900 sm:inline">
              Task Tracker
            </span>
          </Link>

          <div className="flex items-center gap-1 rounded-full bg-ink-900/[0.04] p-1 text-[12px]">
            <Link
              href={isPM ? "/admin" : "/inbox"}
              className="rounded-full px-3 py-1.5 text-ink-700 transition hover:bg-cream-50 hover:text-ink-900"
            >
              {isPM ? "Resumen" : "Bandeja"}
            </Link>
            <Link href="/kanban" className="rounded-full px-3 py-1.5 text-ink-700 transition hover:bg-cream-50 hover:text-ink-900">
              Kanban
            </Link>
            {isPM && (
              <>
                <Link href="/admin/clients" className="rounded-full px-3 py-1.5 text-ink-700 transition hover:bg-cream-50 hover:text-ink-900">
                  Clientes
                </Link>
                <Link href="/admin/teams" className="rounded-full px-3 py-1.5 text-ink-700 transition hover:bg-cream-50 hover:text-ink-900">
                  Equipos
                </Link>
                <Link href="/admin/insights" className="rounded-full px-3 py-1.5 text-ink-700 transition hover:bg-cream-50 hover:text-ink-900">
                  Insights
                </Link>
                <Link
                  href="/admin/tasks/new"
                  className="rounded-full bg-ink-900 px-3 py-1.5 text-cream-50 transition hover:bg-ink-800"
                >
                  Nueva tarea
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 pr-1">
            <div className="hidden text-right sm:block">
              <div className="text-[12px] font-medium text-ink-900">@{user.handle}</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500">
                {user.role === "PM" ? "Project Manager" : (user.team?.name ?? "Miembro")}
              </div>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Cerrar sesión"
                className="
                  flex h-9 w-9 items-center justify-center rounded-full
                  bg-ink-900/[0.04] text-ink-700 ring-1 ring-ink-900/5
                  transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                  hover:bg-ink-900 hover:text-cream-50 hover:scale-105 active:scale-95
                "
                title="Sign out"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </button>
            </form>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-12 sm:px-6 lg:px-10">{children}</main>
    </div>
  );
}
