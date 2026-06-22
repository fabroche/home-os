"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { encolar, obtenerJob } from "@/lib/ai/jobs";
import {
  ConsultaRagPayloadSchema,
  ConsultaRagOutputSchema,
  ProponerContextoPayloadSchema,
  ProponerContextoOutputSchema,
  type BorradorContexto,
} from "@/types/ai";

/**
 * Server Actions del Asistente IA (M6 · F-M6-5/6). La app **encola** una tarea y
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

export type EncolarResult = { ok: true; jobId: string } | { ok: false; error: string };

/** Encola una pregunta (`consulta_rag`). */
export async function preguntarAsistente(input: unknown): Promise<EncolarResult> {
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

/** Encola una petición de propuesta de contexto (`proponer_contexto`). */
export async function proponerContexto(input: unknown): Promise<EncolarResult> {
  const parsed = ProponerContextoPayloadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Describe qué querés que registre." };
  try {
    const user = await requireUser();
    const job = await encolar(user.id, "proponer_contexto", parsed.data);
    return { ok: true, jobId: job.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al proponer." };
  }
}

export type JobEstado =
  | { estado: "pendiente" | "ejecutando" | "desconocido" }
  | { estado: "ok"; tipo: "consulta_rag"; respuesta: string; fuentes: { id: string; titulo: string }[] }
  | { estado: "ok"; tipo: "proponer_contexto"; borradores: BorradorContexto[] }
  | { estado: "error"; error: string };

/** Sondea el estado/resultado de un job propio (lo llama el polling de la burbuja). */
export async function consultarJob(jobId: string): Promise<JobEstado> {
  try {
    const user = await requireUser();
    const job = await obtenerJob(user.id, jobId);
    if (!job) return { estado: "desconocido" };
    if (job.estado === "error") return { estado: "error", error: job.error ?? "Error en la consulta." };
    if (job.estado === "ok") {
      if (job.tipo === "proponer_contexto") {
        const out = ProponerContextoOutputSchema.safeParse(job.resultado);
        if (!out.success) return { estado: "error", error: "Propuesta no válida." };
        return { estado: "ok", tipo: "proponer_contexto", borradores: out.data.borradores };
      }
      const out = ConsultaRagOutputSchema.safeParse(job.resultado);
      if (!out.success) return { estado: "error", error: "Respuesta no válida." };
      return { estado: "ok", tipo: "consulta_rag", respuesta: out.data.respuesta, fuentes: out.data.fuentes };
    }
    return { estado: job.estado }; // pendiente | ejecutando
  } catch {
    return { estado: "desconocido" };
  }
}
