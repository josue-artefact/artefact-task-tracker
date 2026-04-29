/**
 * Parser flexible de duración. Acepta múltiples formatos naturales.
 * Devuelve minutos enteros, o null si no entiende.
 *
 * Ejemplos:
 *   "30"      → 30  min
 *   "30m"     → 30  min
 *   "1h"      → 60  min
 *   "1.5h"    → 90  min
 *   "1h30"    → 90  min
 *   "1h 30m"  → 90  min
 *   "90m"     → 90  min
 *   "2:15"    → 135 min
 *   "0.5h"    → 30  min
 */
export function parseDuration(input: string): number | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;

  // 1. Formato H:MM (ej: "2:15" → 135)
  const colon = s.match(/^(\d+):(\d{1,2})$/);
  if (colon) {
    const h = parseInt(colon[1], 10);
    const m = parseInt(colon[2], 10);
    if (m >= 60) return null;
    return h * 60 + m;
  }

  // 2. Formato con horas y opcional minutos: "1h30", "1h 30m", "1.5h", "1h"
  const withH = s.match(/^(\d+(?:\.\d+)?)\s*h(?:\s*(\d+)\s*m?)?$/);
  if (withH) {
    const h = parseFloat(withH[1]);
    const m = withH[2] ? parseInt(withH[2], 10) : 0;
    if (Number.isNaN(h) || m >= 60) return null;
    return Math.round(h * 60 + m);
  }

  // 3. Solo minutos: "30m" o "90"
  const onlyM = s.match(/^(\d+)\s*m?$/);
  if (onlyM) {
    return parseInt(onlyM[1], 10);
  }

  return null;
}

/**
 * Formatea minutos a string legible.
 *   30  → "30 min"
 *   60  → "1 h"
 *   90  → "1 h 30 min"
 *   135 → "2 h 15 min"
 */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return "0 min";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/** Versión compacta: "1h30" / "30m" / "1h" */
export function formatDurationCompact(minutes: number): string {
  if (minutes <= 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}`;
}

/** Hora "hoy" en zona local sin horas (00:00 local) */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Convierte un input <input type="date"> (YYYY-MM-DD) a Date local 00:00 */
export function dateInputToDate(value: string): Date | null {
  if (!value) return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
}

/** Date → "YYYY-MM-DD" para <input type="date"> */
export function dateToInputValue(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
