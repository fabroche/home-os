import "@/lib/server-guard";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  JOB_PAYLOAD_SCHEMAS,
  type AiJob,
  type AiJobTipo,
  type EstadoJob,
  type TipoEncolable,
} from "@/types/ai";

/**
 * Cola de jobs del Asistente IA (M6 · F-M6-1). La app encola tareas tipadas con
 * payload validado; el worker las toma con `tomarSiguiente` (claim atómico FIFO)
 * y cierra con `marcar`. Usa el cliente service_role (bypassa RLS) — solo servidor.
 */

type JobRow = {
  id: string;
  user_id: string;
  tipo: string;
  payload: unknown;
  estado: string;
  resultado: unknown | null;
  intentos: number;
  error: string | null;
  created_at: string;
  finished_at: string | null;
};

function rowToJob(r: JobRow): AiJob {
  return {
    id: r.id,
    userId: r.user_id,
    tipo: r.tipo as AiJobTipo,
    payload: r.payload,
    estado: r.estado as EstadoJob,
    resultado: r.resultado ?? null,
    intentos: r.intentos,
    error: r.error ?? null,
    createdAt: r.created_at,
    finishedAt: r.finished_at ?? null,
  };
}

/** Encola una tarea validando el payload contra el esquema de su tipo. */
export async function encolar(
  userId: string,
  tipo: TipoEncolable,
  payload: unknown,
): Promise<AiJob> {
  const schema = JOB_PAYLOAD_SCHEMAS[tipo];
  if (!schema) throw new Error(`encolar: tipo sin esquema de payload: ${tipo}`);
  const parsed = schema.parse(payload); // lanza ZodError si no valida

  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("ai_jobs")
    .insert({ user_id: userId, tipo, payload: parsed, estado: "pendiente", intentos: 0 })
    .select("*")
    .single();
  if (error) throw new Error(`encolar: ${error.message}`);
  return rowToJob(data as JobRow);
}

/**
 * Toma el siguiente job pendiente (FIFO) marcándolo `ejecutando` de forma atómica
 * (función SQL con FOR UPDATE SKIP LOCKED). Devuelve null si no hay pendientes.
 */
export async function tomarSiguiente(): Promise<AiJob | null> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb.rpc("tomar_ai_job");
  if (error) throw new Error(`tomarSiguiente: ${error.message}`);
  const rows = (data as JobRow[] | null) ?? [];
  const first = rows[0];
  return first ? rowToJob(first) : null;
}

/** Cierra un job con su resultado (ok) o su error (reintentable). */
export async function marcar(
  id: string,
  estado: Extract<EstadoJob, "ok" | "error">,
  detalle: { resultado?: unknown; error?: string } = {},
): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb
    .from("ai_jobs")
    .update({
      estado,
      resultado: detalle.resultado ?? null,
      error: detalle.error ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(`marcar: ${error.message}`);
}
