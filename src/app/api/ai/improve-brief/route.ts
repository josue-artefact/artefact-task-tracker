import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/auth";
import { improveBrief } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Auth: cualquier usuario logueado puede usar el botón
  // (PMs siempre, miembros cuando editan tareas asignadas a ellos).
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  // Rate limit: 10/min y 60/hora por usuario. Frena spam accidental sin
  // estorbar el uso normal (un PM creando varias tareas seguidas cabe).
  const minuteLimit = rateLimit(`ai:min:${user.id}`, { max: 10, windowMs: 60_000 });
  if (!minuteLimit.ok) {
    return NextResponse.json(
      { error: `Demasiadas llamadas. Reintenta en ${minuteLimit.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(minuteLimit.retryAfterSec) } },
    );
  }
  const hourLimit = rateLimit(`ai:hour:${user.id}`, { max: 60, windowMs: 60 * 60_000 });
  if (!hourLimit.ok) {
    return NextResponse.json(
      { error: `Llegaste al máximo por hora. Reintenta en ${Math.ceil(hourLimit.retryAfterSec / 60)} min.` },
      { status: 429, headers: { "Retry-After": String(hourLimit.retryAfterSec) } },
    );
  }

  let body: { title?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const title = String(body?.title ?? "").trim();
  const description = String(body?.description ?? "").trim();

  if (!title) {
    return NextResponse.json({ error: "Falta el título." }, { status: 400 });
  }
  if (title.length > 500) {
    return NextResponse.json({ error: "El título es muy largo." }, { status: 400 });
  }
  if (description.length > 5000) {
    return NextResponse.json(
      { error: "El brief es muy largo." },
      { status: 400 },
    );
  }

  try {
    const improved = await improveBrief({ title, description });
    return NextResponse.json({ improved });
  } catch (e: unknown) {
    if (e instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "API key de Anthropic inválida." },
        { status: 502 },
      );
    }
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Límite de llamadas alcanzado, intenta en unos segundos." },
        { status: 429 },
      );
    }
    if (e instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Error de Anthropic (${e.status}): ${e.message}` },
        { status: 502 },
      );
    }
    const msg = e instanceof Error ? e.message : "Error desconocido.";
    console.error("improve-brief:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
