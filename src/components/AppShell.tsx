import Link from "next/link";
import { ArtefactMark } from "./ArtefactMark";
import { NavLinks } from "./NavLinks";
import { NotificationBell } from "./NotificationBell";
import { logoutAction } from "@/app/actions/auth";
import { prisma } from "@/lib/db";

type Props = {
  user: { id: string; handle: string; name: string; role: string; team?: { name: string } | null };
  children: React.ReactNode;
};

export async function AppShell({ user, children }: Props) {
  const isPM = user.role === "PM";

  // Count de no leídas para el badge inicial (antes del primer fetch del client)
  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, readAt: null },
  });
  return (
    <div className="relative min-h-[100dvh] bg-cream-50">
      {/* Floating glass nav island — dark variant con backdrop-blur sobre el page bg */}
      <header className="sticky top-0 z-40 flex justify-center px-4 pt-6">
        <nav
          className="
            flex w-full max-w-5xl items-center justify-between gap-4
            rounded-full p-1.5
            border border-ink-300/40
            bg-cream-100/70 backdrop-blur-xl
            shadow-[0_8px_30px_rgba(0,0,0,0.3)]
          "
        >
          <Link href={isPM ? "/admin" : "/inbox"} className="flex items-center gap-3 pl-2">
            <ArtefactMark size={36} />
            <span className="hidden text-[14px] font-medium tracking-tight text-ink-900 sm:inline">
              Task Tracker
            </span>
          </Link>

          <div className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-full bg-ink-900/[0.04] p-1 text-[12px] [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            <NavLinks isPM={isPM} />
          </div>

          <div className="flex items-center gap-2 pr-1">
            <div className="hidden text-right sm:block">
              <div className="text-[12px] font-medium text-ink-900">@{user.handle}</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500">
                {user.role === "PM" ? "Project Manager" : (user.team?.name ?? "Miembro")}
              </div>
            </div>
            <NotificationBell initialCount={unreadCount} />
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Cerrar sesión"
                className="
                  flex h-9 w-9 items-center justify-center rounded-full
                  bg-ink-900/[0.04] text-ink-700 ring-1 ring-ink-900/5
                  transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                  hover:bg-cream-300 hover:text-ink-900 hover:scale-105 active:scale-95
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
