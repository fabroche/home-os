/**
 * Errores del motor IA (M6). Claude Code headless (`claude -p`) NO expone (aún) un
 * campo máquina estable para "cuota/límite de uso agotado": el aviso llega como texto
 * ("You've hit your session/weekly/Opus limit · resets …" o el patrón antiguo
 * "Claude AI usage limit reached|<unix>"). Por eso detectamos por string sobre TODO el
 * output, de forma defensiva, distinguiéndolo de un fallo de auth (OAuth token / 401) y
 * de un rate-limit transitorio (429), que sí conviene reintentar.
 *
 * El marcador viaja como `message` del Error → se guarda en `ai_jobs.error` (texto) →
 * `consultarJob` lo traduce a un mensaje claro para el usuario. Módulo PURO (sin I/O):
 * sirve tanto en el runner (worker) como en la Server Action de polling, y es testeable.
 */

/** Prefijo serializable que identifica el error de cuota dentro de `ai_jobs.error`. */
export const MARCADOR_CUOTA = "CUOTA_AGOTADA";

/** Error terminal: se agotó la cuota/límite de uso de la suscripción. NO reintentar. */
export class CuotaAgotadaError extends Error {
  /** Cuándo se renueva, tal cual lo informa Claude ("3:45pm", "Mon 12:00am") o epoch. */
  readonly reset?: string;
  constructor(reset?: string) {
    super(reset ? `${MARCADOR_CUOTA}|${reset}` : MARCADOR_CUOTA);
    this.name = "CuotaAgotadaError";
    this.reset = reset;
  }
}

/** ¿Este error (lanzado o ya serializado en texto) es de cuota agotada? */
export function esCuotaAgotada(e: unknown): boolean {
  if (e instanceof CuotaAgotadaError) return true;
  const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "";
  return msg.startsWith(MARCADOR_CUOTA);
}

// Mensajes conocidos de cuota/límite de uso de Claude Code (no rate-limit 429, no auth).
const PATRONES_CUOTA = [
  /you'?ve hit your[^.\n]*limit/i, // "You've hit your session/weekly/Opus limit · resets …"
  /usage limit reached/i, //          patrón antiguo "Claude AI usage limit reached|<unix>"
  /usage limit/i,
  /\bquota\b/i,
];

/**
 * Detecta en la salida cruda de `claude -p` (stdout + stderr) si el fallo es por cuota
 * agotada y, si puede, extrae cuándo se renueva ("· resets <x>" o "|<unix>").
 */
export function detectarCuota(texto: string): { agotada: boolean; reset?: string } {
  if (!PATRONES_CUOTA.some((re) => re.test(texto))) return { agotada: false };
  const resets = texto.match(/resets?\s+([^\n·|]+)/i);
  const epoch = texto.match(/usage limit reached\|(\d+)/i);
  const reset = resets?.[1]?.trim() || epoch?.[1] || undefined;
  return { agotada: true, reset };
}

/** Formatea el "reset" para el usuario: epoch unix → hora local; si no, lo deja tal cual. */
function formatearReset(reset?: string): string | undefined {
  if (!reset) return undefined;
  if (/^\d+$/.test(reset)) {
    const ms = reset.length <= 10 ? Number(reset) * 1000 : Number(reset);
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    }
  }
  return reset;
}

/**
 * Traduce el error almacenado de un job a un mensaje claro para el usuario. Hoy trata
 * el caso de cuota agotada (el resto se devuelve tal cual o con un fallback genérico).
 */
export function mensajeErrorJob(error: string | null): string {
  if (error && error.startsWith(MARCADOR_CUOTA)) {
    const reset = formatearReset(error.slice(MARCADOR_CUOTA.length).replace(/^\|/, "").trim() || undefined);
    return reset
      ? `Se agotó la cuota de Claude (la IA del asistente). Se renueva ${reset}, vuelve a intentarlo entonces.`
      : "Se agotó la cuota de Claude (la IA del asistente). Vuelve a intentarlo más tarde.";
  }
  return error ?? "Error en la consulta.";
}
