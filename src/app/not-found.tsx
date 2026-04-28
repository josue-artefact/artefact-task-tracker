import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-[100dvh] bg-cream-50 px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-ink-900/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-ink-500 ring-1 ring-ink-900/5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-ink-400" />
          404
        </div>
        <h1 className="font-serif italic text-[clamp(40px,6vw,72px)] leading-[0.95] tracking-tightest text-ink-900">
          Aquí no hay nada.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[15px] text-ink-600">
          La página que buscas no existe o fue movida.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="group inline-flex items-center gap-1 rounded-full bg-ink-900 py-2.5 pl-5 pr-2 text-[12px] font-medium uppercase tracking-[0.18em] text-cream-50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-ink-800 active:scale-[0.98]"
          >
            <span>Volver al inicio</span>
            <span className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-cream-50/15 transition-all duration-500 group-hover:translate-x-0.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}
