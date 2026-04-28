import Anthropic from "@anthropic-ai/sdk";

/**
 * System prompt para el asistente que mejora briefs de tareas.
 * Está pensado para Artefact Studio (estudio creativo, equipos hispanohablantes).
 *
 * Está marcado con cache_control para que el SDK lo cachee. Hoy es muy corto y
 * no llega al mínimo de prefix cacheable de Opus 4.7 (~4096 tokens), así que el
 * cache no se activará todavía — pero queda listo para cuando crezca.
 */
const SYSTEM_PROMPT = `Eres un asistente que ayuda a project managers y miembros de Artefact Studio (un estudio creativo) a escribir briefs de tareas claros, accionables y bien escritos en español.

Tu trabajo: tomar el título de una tarea (siempre presente) y un brief actual (puede estar vacío) y devolver una versión mejorada del brief.

Reglas estrictas:
- Responde SIEMPRE en español de México, tono profesional pero cálido.
- Mantén entre 1 y 4 oraciones. Prioriza claridad y brevedad sobre detalle.
- Si el brief actual está vacío, propón uno breve basado en el título — el alcance natural de la tarea.
- Si el brief actual ya está bien escrito, mejóralo marginalmente, sin rehacerlo.
- NO incluyas títulos, encabezados, bullets ni etiquetas ("Brief:", "Descripción:").
- NO te presentes ni hagas preámbulos como "Aquí está la versión mejorada".
- Devuelve únicamente el texto del brief mejorado. Nada más.`;

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (_client) return _client;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY no está configurada. Añádela a .env.local y reinicia el servidor.",
    );
  }
  _client = new Anthropic();
  return _client;
}

/**
 * Devuelve un brief mejorado basado en el título y la descripción actual.
 * Usa Claude Opus 4.7 con adaptive thinking + effort low (tarea creativa
 * pero acotada — el modelo decide cuánto pensar).
 */
export async function improveBrief({
  title,
  description,
}: {
  title: string;
  description: string;
}): Promise<string> {
  const userContent = description.trim()
    ? `Título de la tarea: ${title}\n\nBrief actual:\n${description}\n\nDevuelve la versión mejorada del brief, solo el texto.`
    : `Título de la tarea: ${title}\n\nNo hay brief escrito todavía. Propón uno breve basado en el título.`;

  const response = await getClient().messages.create({
    model: "claude-opus-4-7",
    max_tokens: 1024,
    thinking: { type: "adaptive" },
    output_config: { effort: "low" },
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userContent }],
  });

  for (const block of response.content) {
    if (block.type === "text") {
      return block.text.trim();
    }
  }
  throw new Error("La respuesta de Claude no contenía texto.");
}
