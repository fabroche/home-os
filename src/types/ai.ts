import { z } from "zod";

/**
 * Tipos de dominio del Asistente IA (M6). La cola `ai_jobs` guarda tareas tipadas
 * que el worker drena con el runner. Los contratos de SALIDA y el prompt viven en
 * `lib/ai/runner` (Fase 1); aquí: tipos de tarea, estados y esquemas de PAYLOAD
 * de entrada (lo que se valida al encolar).
 */

export const AI_JOB_TIPOS = [
  "clasificar_correo",
  "extraer_factura",
  "conciliar_gasto",
  "puntuar_evento",
  "resumen_semana",
  "consulta_rag",
  "proponer_contexto",
] as const;
export type AiJobTipo = (typeof AI_JOB_TIPOS)[number];

export const ESTADOS_JOB = ["pendiente", "ejecutando", "ok", "error"] as const;
export type EstadoJob = (typeof ESTADOS_JOB)[number];

// --- Payloads de entrada por tipo (MVP: consulta_rag y proponer_contexto) -----
export const ConsultaRagPayloadSchema = z.object({
  pregunta: z.string().trim().min(1, "La pregunta es obligatoria").max(2000),
});
export type ConsultaRagPayload = z.infer<typeof ConsultaRagPayloadSchema>;

export const ProponerContextoPayloadSchema = z.object({
  peticion: z.string().trim().min(1, "La petición es obligatoria").max(2000),
});
export type ProponerContextoPayload = z.infer<typeof ProponerContextoPayloadSchema>;

/**
 * Registro de esquemas de payload por tipo. Solo se pueden encolar tipos con
 * esquema (evita meter payloads sin validar). Los demás tipos se añaden cuando se
 * implemente su módulo consumidor (M1/M2/M3).
 */
export const JOB_PAYLOAD_SCHEMAS = {
  consulta_rag: ConsultaRagPayloadSchema,
  proponer_contexto: ProponerContextoPayloadSchema,
} satisfies Partial<Record<AiJobTipo, z.ZodTypeAny>>;

export type TipoEncolable = keyof typeof JOB_PAYLOAD_SCHEMAS;

/** DTO de dominio de un job (mapea la fila de `ai_jobs`). */
export type AiJob = {
  id: string;
  tipo: AiJobTipo;
  payload: unknown;
  estado: EstadoJob;
  resultado: unknown | null;
  intentos: number;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
};
