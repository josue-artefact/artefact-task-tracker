/**
 * Rate limit en memoria, por handle.
 *
 * Limitación conocida: en Vercel (serverless) cada invocación puede caer en
 * una instancia distinta, así que el límite no es perfecto entre cold starts.
 * Para un equipo interno de ~8 personas es suficiente — el objetivo es evitar
 * spam accidental (alguien dejando el botón presionado) y caps por usuario,
 * no defenderse de un atacante distribuido.
 *
 * Si el equipo crece o queremos limites realmente firmes, mover a Upstash
 * Redis o Vercel KV (~5 min de cambio).
 */

type Bucket = { hits: number[] };
const buckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number };

/**
 * Permite `max` solicitudes en una ventana de `windowMs` por `key`.
 * Devuelve si se permite la actual y, si no, en cuántos segundos reintentar.
 */
export function rateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }
  // Drop hits older than the window
  bucket.hits = bucket.hits.filter((t) => t > cutoff);

  if (bucket.hits.length >= max) {
    const oldest = bucket.hits[0];
    const retryAfterMs = oldest + windowMs - now;
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }

  bucket.hits.push(now);
  return { ok: true, remaining: max - bucket.hits.length };
}
