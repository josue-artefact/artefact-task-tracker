import { redirect } from "next/navigation";
import { ArtefactMark } from "@/components/ArtefactMark";
import { fetchRandomQuote } from "@/lib/quotes";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./_login/LoginForm";
import { RotatingQuote } from "./_login/RotatingQuote";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; handle?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "PM" ? "/admin" : "/inbox");

  const sp = await searchParams;
  const initialQuote = await fetchRandomQuote();

  let errorMessage: string | null = null;
  if (sp.error === "unknown") errorMessage = `No encontramos a @${sp.handle ?? ""}.`;
  else if (sp.error === "empty") errorMessage = "Escribe tu handle.";

  return (
    <main className="relative min-h-[100dvh] w-full overflow-hidden bg-cream-50">
      {/* Soft radial wash, top-left */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[20%] -top-[30%] h-[80vh] w-[80vh] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(200,230,107,0.18), rgba(200,230,107,0) 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[15%] -bottom-[25%] h-[70vh] w-[70vh] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(200,101,74,0.10), rgba(200,101,74,0) 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Top corner — small handle hint */}
      <div className="absolute top-6 left-6 z-10 text-[11px] uppercase tracking-[0.2em] text-ink-500">
        Artefact · Studio
      </div>
      <div className="absolute top-6 right-6 z-10 text-[11px] uppercase tracking-[0.2em] text-ink-400">
        Interno · v0.1
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-3xl flex-col items-center justify-center px-6 py-20">
        {/* Logo */}
        <div className="mb-12 animate-fade-up [animation-delay:80ms]">
          <ArtefactMark size={104} />
        </div>

        {/* Rotating quote */}
        <RotatingQuote initial={initialQuote} />

        {/* Login form */}
        <div className="mt-16 w-full max-w-md animate-fade-up [animation-delay:240ms]">
          <LoginForm errorMessage={errorMessage} />
        </div>

        <p className="mt-10 text-[11px] uppercase tracking-[0.2em] text-ink-400 animate-fade-up [animation-delay:320ms]">
          Un espacio para el trabajo · No para el ruido
        </p>
      </div>
    </main>
  );
}
