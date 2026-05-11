import { prisma } from "@/lib/db";
import { formatRelative } from "@/lib/format";
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "@/app/actions/announcements";
import { EditCard, EditTrigger, EditPanel } from "./EditDisclosure";

/**
 * Tablón de noticias.
 * Muestra los anuncios activos (no expirados), pinned primero.
 * Para PM expone formulario de creación + edit/delete inline.
 */
export async function AnnouncementBoard({ isPM }: { isPM: boolean }) {
  const now = new Date();
  const announcements = await prisma.announcement.findMany({
    where: {
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: { author: true },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });

  // No mostrar nada si no hay anuncios y el usuario es miembro.
  if (announcements.length === 0 && !isPM) return null;

  return (
    <section className="mb-10 animate-fade-up">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-ink-500">
          <span className="inline-block h-1 w-6 bg-cream-300" />
          Tablón
          {announcements.length > 0 && (
            <span className="text-ink-400">· {announcements.length}</span>
          )}
        </h2>
        {isPM && <NewAnnouncementButton />}
      </div>

      {announcements.length === 0 && isPM && (
        <div className="rounded-2xl bg-cream-100 border border-ink-300/30 px-6 py-8 text-center">
          <p className="text-sm text-ink-400">
            Aún no hay anuncios. Publica el primero arriba.
          </p>
        </div>
      )}

      {announcements.length > 0 && (
        <ul className="grid gap-3">
          {announcements.map((a) => {
            const expiresLabel = a.expiresAt
              ? a.expiresAt.toISOString().slice(0, 10)
              : "";
            return (
              <li key={a.id}>
                <article
                  className={`rounded-2xl bg-cream-100 border p-5 transition ${
                    a.pinned
                      ? "border-accent-lime/40 shadow-[0_0_0_1px_rgba(163,255,18,0.08)_inset]"
                      : "border-ink-300/30"
                  }`}
                >
                  <EditCard>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-ink-500">
                            {a.pinned && (
                              <>
                                <span className="inline-flex items-center gap-1 rounded-full bg-accent-lime/15 px-2 py-0.5 text-accent-lime ring-1 ring-accent-lime/30">
                                  <span className="h-1 w-1 rounded-full bg-accent-lime" />
                                  Fijo
                                </span>
                                <span className="opacity-30">·</span>
                              </>
                            )}
                            <span>@{a.author.handle}</span>
                            <span className="opacity-30">·</span>
                            <span>{formatRelative(a.createdAt)}</span>
                            {a.expiresAt && (
                              <>
                                <span className="opacity-30">·</span>
                                <span>vence {expiresLabel}</span>
                              </>
                            )}
                          </div>
                          <h3 className="mt-2 font-semibold tracking-tight text-[20px] leading-tight text-ink-900">
                            {a.title}
                          </h3>
                          <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-700">
                            {a.body}
                          </p>
                        </div>

                        {isPM && (
                          <div className="flex shrink-0 items-start gap-1.5">
                            <EditTrigger />
                            <form action={deleteAnnouncement}>
                              <input type="hidden" name="id" value={a.id} />
                              <button
                                type="submit"
                                aria-label="Borrar anuncio"
                                className="rounded-full bg-ink-900/[0.04] p-2 text-ink-500 ring-1 ring-ink-900/5 transition hover:bg-accent-rust hover:text-on-accent"
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
                                </svg>
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                      {isPM && (
                        <EditPanel className="mt-4 rounded-2xl bg-cream-200 p-4 border border-ink-300/30">
                          <form action={updateAnnouncement} className="space-y-2">
                            <input type="hidden" name="id" value={a.id} />
                            <Input name="title" required defaultValue={a.title} placeholder="Título" />
                            <Textarea name="body" required rows={3} defaultValue={a.body} placeholder="Cuerpo" />
                            <div className="flex items-center gap-3 text-[11px] text-ink-700">
                              <label className="flex items-center gap-1.5">
                                <input
                                  type="checkbox"
                                  name="pinned"
                                  defaultChecked={a.pinned}
                                  className="h-3.5 w-3.5 rounded border-ink-900/20 accent-ink-900"
                                />
                                Fijar arriba
                              </label>
                              <input
                                type="date"
                                name="expiresAt"
                                defaultValue={expiresLabel}
                                className="ml-auto rounded-lg bg-ink-900/[0.04] px-2 py-1 text-[11px] text-ink-700 ring-1 ring-ink-900/5"
                              />
                            </div>
                            <div className="flex justify-end">
                              <Submit small>Guardar</Submit>
                            </div>
                          </form>
                        </EditPanel>
                      )}
                    </EditCard>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ---------------- Subcomponents ---------------- */

function NewAnnouncementButton() {
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer items-center gap-1.5 rounded-full bg-cream-300 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-900 transition hover:bg-ink-800 [&::-webkit-details-marker]:hidden">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-open:rotate-45">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>Nuevo anuncio</span>
      </summary>
      <div className="absolute right-0 top-full z-30 mt-2 w-[min(420px,90vw)] rounded-2xl bg-cream-100 border border-ink-300/40 shadow-[0_20px_60px_rgba(9,9,11,0.10)] animate-fade-up">
        <form action={createAnnouncement} className="p-5 space-y-3">
          <Input name="title" required placeholder="Título" />
          <Textarea name="body" required rows={3} placeholder="Mensaje" />
          <div className="flex items-center gap-3 text-[11px] text-ink-700">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                name="pinned"
                className="h-3.5 w-3.5 rounded border-ink-900/20 accent-ink-900"
              />
              Fijar arriba
            </label>
            <input
              type="date"
              name="expiresAt"
              className="ml-auto rounded-lg bg-ink-900/[0.04] px-2 py-1 text-[11px] text-ink-700 ring-1 ring-ink-900/5"
            />
          </div>
          <div className="flex justify-end">
            <Submit>Publicar</Submit>
          </div>
        </form>
      </div>
    </details>
  );
}

function Input({ className = "", ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={`w-full rounded-xl bg-ink-900/[0.04] px-3 py-2.5 text-[13px] text-ink-900 ring-1 ring-ink-900/5 placeholder:text-ink-400 focus:bg-ink-900/[0.06] focus:outline-none focus:ring-ink-900/20 ${className}`}
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
        "group flex items-center justify-between gap-1 rounded-full bg-cream-300 text-ink-900 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-ink-800 active:scale-[0.98]",
        small
          ? "py-1.5 pl-3 pr-1 text-[10px] font-medium uppercase tracking-[0.18em]"
          : "py-2 pl-5 pr-2 text-[12px] font-medium uppercase tracking-[0.18em]",
      ].join(" ")}
    >
      <span>{children}</span>
      <span className={`ml-2 flex items-center justify-center rounded-full bg-cream-100/15 transition-all duration-500 group-hover:translate-x-0.5 ${small ? "h-5 w-5" : "h-7 w-7"}`}>
        <svg width={small ? 9 : 11} height={small ? 9 : 11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </button>
  );
}
