"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { encolar, obtenerJob } from "@/lib/ai/jobs";
import { ConsultaRagPayloadSchema, ConsultaRagOutputSchema } from "@/types/ai";

/**
 * Server Actions del Asistente IA (M6 · F-M6-5). La app **encola** una consulta y
 * **sondea** (polling) su resultado; el worker la ejecuta con el runner. Resultado
 * discriminado para no lanzar a través de la frontera servidor↔cliente.
 */

async function requireUser() {
  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("No autenticado.");
  return user;
}

export type PreguntarResult = { ok: true; jobId: string } | { ok: false; error: string };

/** Encola una pregunta (`consulta_rag`) y devuelve el id del job a sondear. */
export async function preguntarAsistente(input: unknown): Promise<PreguntarResult> {
  const parsed = ConsultaRagPayloadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Escribe una pregunta." };
  try {
    const user = await requireUser();
    const job = await encolar(user.id, "consulta_rag", parsed.data);
    return { ok: true, jobId: job.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al consultar." };
  }
}

export type JobEstado =
  | { estado: "pendiente" | "ejecutando" }
  | { estado: "ok"; respuesta: string; fuentes: { id: string; titulo: string }[] }
  | { estado: "error"; error: string }
  | { estado: "desconocido" };

/** Sondea el estado/resultado de un job propio (lo llama el polling de la burbuja). */
export async function consultarJob(jobId: string): Promise<JobEstado> {
  try {
    const user = await requireUser();
    const job = await obtenerJob(user.id, jobId);
    if (!job) return { estado: "desconocido" };
    if (job.estado === "error") return { estado: "error", error: job.error ?? "Error en la consulta." };
    if (job.estado === "ok") {
      const out = ConsultaRagOutputSchema.safeParse(job.resultado);
      if (!out.success) return { estado: "error", error: "Respuesta no válida." };
      return { estado: "ok", respuesta: out.data.respuesta, fuentes: out.data.fuentes };
    }
    return { estado: job.estado };
  } catch {
    return { estado: "desconocido" };
  }
}
