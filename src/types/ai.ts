import { z } from "zod";
import { TIPOS_CONTEXTO } from "@/types/contexto";
import { CrearMovimientoInputSchema } from "@/types/finanzas";

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
  "registrar_gasto",
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

export const RegistrarGastoPayloadSchema = z.object({
  peticion: z.string().trim().min(1, "La petición es obligatoria").max(2000),
});
export type RegistrarGastoPayload = z.infer<typeof RegistrarGastoPayloadSchema>;

/**
 * Registro de esquemas de payload por tipo. Solo se pueden encolar tipos con
 * esquema (evita meter payloads sin validar). Los demás tipos se añaden cuando se
 * implemente su módulo consumidor (M1/M2/M3).
 */
export const JOB_PAYLOAD_SCHEMAS = {
  consulta_rag: ConsultaRagPayloadSchema,
  proponer_contexto: ProponerContextoPayloadSchema,
  registrar_gasto: RegistrarGastoPayloadSchema,
} satisfies Partial<Record<AiJobTipo, z.ZodTypeAny>>;

export type TipoEncolable = keyof typeof JOB_PAYLOAD_SCHEMAS;

// --- Salidas validadas por tipo (el runner valida ANTES de persistir) --------
export const ConsultaRagOutputSchema = z.object({
  respuesta: z.string().trim().min(1),
  fuentes: z.array(z.object({ id: z.string(), titulo: z.string() })).default([]),
});
export type ConsultaRagOutput = z.infer<typeof ConsultaRagOutputSchema>;

/** Borrador de contexto que propone la IA (sin id/estado; se inserta como borrador). */
export const BorradorContextoSchema = z.object({
  tipo: z.enum(TIPOS_CONTEXTO),
  titulo: z.string().trim().min(1).max(200),
  contenido: z.string().trim().min(1),
  tags: z.array(z.string()).default([]),
});
export type BorradorContexto = z.infer<typeof BorradorContextoSchema>;

export const ProponerContextoOutputSchema = z.object({
  borradores: z.array(BorradorContextoSchema).min(1).max(5),
});
export type ProponerContextoOutput = z.infer<typeof ProponerContextoOutputSchema>;

/**
 * Salida de `registrar_gasto`: la IA **propone** un movimiento (validado con el MISMO
 * esquema con el que se crea, así la propuesta es directamente confirmable) o devuelve
 * `propuesta: null` con una `nota` si le falta info. La IA NO ejecuta: solo propone;
 * la escritura ocurre cuando el usuario confirma (gobernanza "propone → aprueba → crea").
 */
export const RegistrarGastoOutputSchema = z.object({
  propuesta: CrearMovimientoInputSchema.nullable(),
  nota: z.string().trim().max(500).optional(),
});
export type RegistrarGastoOutput = z.infer<typeof RegistrarGastoOutputSchema>;

export const JOB_OUTPUT_SCHEMAS = {
  consulta_rag: ConsultaRagOutputSchema,
  proponer_contexto: ProponerContextoOutputSchema,
  registrar_gasto: RegistrarGastoOutputSchema,
} satisfies Partial<Record<AiJobTipo, z.ZodTypeAny>>;

/** DTO de dominio de un job (mapea la fila de `ai_jobs`). */
export type AiJob = {
  id: string;
  userId: string;
  tipo: AiJobTipo;
  payload: unknown;
  estado: EstadoJob;
  resultado: unknown | null;
  intentos: number;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
};
