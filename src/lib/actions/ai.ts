"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { encolar, obtenerJob } from "@/lib/ai/jobs";
import { mensajeErrorJob } from "@/lib/ai/errors";
import {
  ConsultaRagPayloadSchema,
  ConsultaRagOutputSchema,
  ProponerContextoPayloadSchema,
  ProponerContextoOutputSchema,
  RegistrarGastoPayloadSchema,
  RegistrarGastoOutputSchema,
  RegistrarIngresoPayloadSchema,
  RegistrarDeudaPayloadSchema,
  RegistrarDeudaOutputSchema,
  MarcarPagadoPayloadSchema,
  MarcarPagadoOutputSchema,
  AsistentePayloadSchema,
  AsistenteOutputSchema,
  type MarcarPagadoOutput,
  type BorradorContexto,
  type AccionAsistente,
  type ObjetivoBorrar,
} from "@/types/ai";
import type { CrearMovimientoInput, CrearDeudaInput } from "@/types/finanzas";

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

/** Encola una petición de registrar un gasto (`registrar_gasto`). La IA solo propone. */
export async function registrarGasto(input: unknown): Promise<EncolarResult> {
  const parsed = RegistrarGastoPayloadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Describe el gasto que querés registrar." };
  try {
    const user = await requireUser();
    const job = await encolar(user.id, "registrar_gasto", parsed.data);
    return { ok: true, jobId: job.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al registrar." };
  }
}

/** Encola una petición de registrar un ingreso (`registrar_ingreso`). La IA solo propone. */
export async function registrarIngreso(input: unknown): Promise<EncolarResult> {
  const parsed = RegistrarIngresoPayloadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Describe el ingreso que querés registrar." };
  try {
    const user = await requireUser();
    const job = await encolar(user.id, "registrar_ingreso", parsed.data);
    return { ok: true, jobId: job.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al registrar." };
  }
}

/** Encola una petición de registrar una deuda/pago (`registrar_deuda`). La IA solo propone. */
export async function registrarDeuda(input: unknown): Promise<EncolarResult> {
  const parsed = RegistrarDeudaPayloadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Describe la deuda o el pago que querés registrar." };
  try {
    const user = await requireUser();
    const job = await encolar(user.id, "registrar_deuda", parsed.data);
    return { ok: true, jobId: job.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al registrar." };
  }
}

/** Encola una petición de marcar un gasto como pagado (`marcar_pagado`). La IA solo propone cuál. */
export async function marcarPagado(input: unknown): Promise<EncolarResult> {
  const parsed = MarcarPagadoPayloadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dime qué gasto marco como pagado." };
  try {
    const user = await requireUser();
    const job = await encolar(user.id, "marcar_pagado", parsed.data);
    return { ok: true, jobId: job.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al marcar." };
  }
}

/**
 * Encola un mensaje en lenguaje natural para el **router** del asistente (`asistente`).
 * El modelo clasifica la intención y propone (o pide aclaración) en una sola pasada;
 * sustituye a la heurística de intención del cliente.
 */
export async function enviarAlAsistente(input: unknown): Promise<EncolarResult> {
  const parsed = AsistentePayloadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Escribe un mensaje." };
  try {
    const user = await requireUser();
    const job = await encolar(user.id, "asistente", parsed.data);
    return { ok: true, jobId: job.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al consultar." };
  }
}

export type JobEstado =
  | { estado: "pendiente" | "ejecutando" | "desconocido" }
  | { estado: "ok"; tipo: "consulta_rag"; respuesta: string; fuentes: { id: string; titulo: string }[] }
  | { estado: "ok"; tipo: "proponer_contexto"; borradores: BorradorContexto[] }
  | { estado: "ok"; tipo: "registrar_gasto"; propuesta: CrearMovimientoInput | null; nota?: string }
  | { estado: "ok"; tipo: "registrar_ingreso"; propuesta: CrearMovimientoInput | null; nota?: string }
  | { estado: "ok"; tipo: "registrar_deuda"; propuestaDeuda: CrearDeudaInput | null; nota?: string }
  | {
      estado: "ok";
      tipo: "marcar_pagado";
      movimiento: MarcarPagadoOutput["movimiento"];
      candidatos: MarcarPagadoOutput["candidatos"];
      nota?: string;
    }
  | { estado: "ok"; tipo: "borrar"; objetivo: ObjetivoBorrar | null; candidatos: ObjetivoBorrar[]; nota?: string }
  | { estado: "ok"; tipo: "aclarar"; pregunta: string; opciones: { etiqueta: string; accion: AccionAsistente }[] }
  | { estado: "error"; error: string };

/** Sondea el estado/resultado de un job propio (lo llama el polling de la burbuja). */
export async function consultarJob(jobId: string): Promise<JobEstado> {
  try {
    const user = await requireUser();
    const job = await obtenerJob(user.id, jobId);
    if (!job) return { estado: "desconocido" };
    if (job.estado === "error") return { estado: "error", error: mensajeErrorJob(job.error) };
    if (job.estado === "ok") {
      if (job.tipo === "proponer_contexto") {
        const out = ProponerContextoOutputSchema.safeParse(job.resultado);
        if (!out.success) return { estado: "error", error: "Propuesta no válida." };
        return { estado: "ok", tipo: "proponer_contexto", borradores: out.data.borradores };
      }
      if (job.tipo === "registrar_gasto" || job.tipo === "registrar_ingreso") {
        const out = RegistrarGastoOutputSchema.safeParse(job.resultado);
        if (!out.success) return { estado: "error", error: "Propuesta de movimiento no válida." };
        return { estado: "ok", tipo: job.tipo, propuesta: out.data.propuesta, nota: out.data.nota };
      }
      if (job.tipo === "registrar_deuda") {
        const out = RegistrarDeudaOutputSchema.safeParse(job.resultado);
        if (!out.success) return { estado: "error", error: "Propuesta de deuda no válida." };
        return { estado: "ok", tipo: "registrar_deuda", propuestaDeuda: out.data.propuesta, nota: out.data.nota };
      }
      if (job.tipo === "marcar_pagado") {
        const out = MarcarPagadoOutputSchema.safeParse(job.resultado);
        if (!out.success) return { estado: "error", error: "No pude identificar el gasto." };
        return {
          estado: "ok",
          tipo: "marcar_pagado",
          movimiento: out.data.movimiento,
          candidatos: out.data.candidatos,
          nota: out.data.nota,
        };
      }
      if (job.tipo === "asistente") {
        // El router devuelve una salida discriminada; la mapeamos a los MISMOS estados
        // que ya sabe pintar la burbuja (así cada tarjeta se reutiliza tal cual) + "aclarar".
        const out = AsistenteOutputSchema.safeParse(job.resultado);
        if (!out.success) return { estado: "error", error: "Respuesta del asistente no válida." };
        const d = out.data;
        switch (d.accion) {
          case "responder":
            return { estado: "ok", tipo: "consulta_rag", respuesta: d.respuesta, fuentes: d.fuentes };
          case "gasto":
            return { estado: "ok", tipo: "registrar_gasto", propuesta: d.propuesta, nota: d.nota };
          case "ingreso":
            return { estado: "ok", tipo: "registrar_ingreso", propuesta: d.propuesta, nota: d.nota };
          case "deuda":
            return { estado: "ok", tipo: "registrar_deuda", propuestaDeuda: d.propuesta, nota: d.nota };
          case "pagado":
            return { estado: "ok", tipo: "marcar_pagado", movimiento: d.movimiento, candidatos: d.candidatos, nota: d.nota };
          case "borrar":
            return { estado: "ok", tipo: "borrar", objetivo: d.objetivo, candidatos: d.candidatos, nota: d.nota };
          case "contexto":
            return { estado: "ok", tipo: "proponer_contexto", borradores: d.borradores };
          case "aclarar":
            return { estado: "ok", tipo: "aclarar", pregunta: d.pregunta, opciones: d.opciones };
        }
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
