"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  /** Función que recibe el pathname y devuelve true si esta entrada debe verse activa. */
  match: (path: string) => boolean;
};

/**
 * Construye los items del nav según el rol. Los matchers permiten que una
 * misma entrada se quede activa en sub-rutas relacionadas (ej. "Pipelines"
 * cubre /admin/pipelines, /admin/pipelines/new y /pipeline/[id]).
 */
function buildItems(isPM: boolean): NavItem[] {
  const items: NavItem[] = [
    isPM
      ? { href: "/admin", label: "Resumen", match: (p) => p === "/admin" || p.startsWith("/admin/archive") || p.startsWith("/admin/tasks") }
      : { href: "/inbox", label: "Bandeja", match: (p) => p === "/inbox" },
    { href: "/kanban", label: "Kanban", match: (p) => p === "/kanban" },
  ];
  if (isPM) {
    items.push(
      { href: "/admin/pipelines", label: "Pipelines", match: (p) => p.startsWith("/admin/pipelines") || p.startsWith("/pipeline/") },
      { href: "/admin/clients",   label: "Clientes",  match: (p) => p.startsWith("/admin/clients") },
      { href: "/admin/teams",     label: "Equipos",   match: (p) => p.startsWith("/admin/teams") },
      { href: "/admin/insights",  label: "Insights",  match: (p) => p.startsWith("/admin/insights") },
    );
  }
  return items;
}

export function NavLinks({ isPM }: { isPM: boolean }) {
  const pathname = usePathname() || "";
  const items = buildItems(isPM);

  return (
    <>
      {items.map((it) => {
        const active = it.match(pathname);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={[
              "shrink-0 rounded-full px-3 py-1.5 transition-all duration-300",
              active
                ? "bg-accent-lime/15 text-accent-lime ring-1 ring-accent-lime/30"
                : "text-ink-700 hover:bg-cream-200 hover:text-ink-900",
            ].join(" ")}
          >
            {it.label}
          </Link>
        );
      })}
      {isPM && (
        <Link
          href="/admin/tasks/new"
          className="shrink-0 rounded-full bg-accent-lime px-3 py-1.5 font-medium text-cream-50 transition hover:bg-accent-lime/85"
        >
          Nueva tarea
        </Link>
      )}
    </>
  );
}
