import { z } from "zod";
import { TIPOS_CONTEXTO } from "@/types/contexto";
import { CrearMovimientoInputSchema, CrearDeudaInputSchema } from "@/types/finanzas";
import { HERRAMIENTAS } from "@/types/ai-tools";

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
  "registrar_ingreso",
  "registrar_deuda",
  "marcar_pagado",
  "asistente",
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

// Ingreso, deuda y marcar-pagado comparten la forma de payload (una petición en
// lenguaje natural). Se mantienen como esquemas propios por claridad de contrato.
export const RegistrarIngresoPayloadSchema = RegistrarGastoPayloadSchema;
export const RegistrarDeudaPayloadSchema = RegistrarGastoPayloadSchema;
export const MarcarPagadoPayloadSchema = RegistrarGastoPayloadSchema;

/**
 * Router único del asistente (`asistente`): el usuario manda un MENSAJE en lenguaje
 * natural y el modelo decide la intención en UNA pasada (responder/registrar/…/aclarar).
 * Sustituye a la heurística de intención del cliente: clasificar lo hace el modelo.
 */
/** Un turno de la conversación reciente que se envía al router como contexto. */
export const TurnoConversacionSchema = z.object({
  rol: z.enum(["user", "assistant"]),
  texto: z.string().trim().min(1).max(2000),
});
export type TurnoConversacion = z.infer<typeof TurnoConversacionSchema>;

export const AsistentePayloadSchema = z.object({
  mensaje: z.string().trim().min(1, "El mensaje es obligatorio").max(2000),
  /**
   * Conversación reciente (más antiguo→más nuevo) para que el router entienda
   * correcciones/ajustes a una propuesta anterior (ej. "no, fue hace 2 días").
   */
  historial: z.array(TurnoConversacionSchema).max(12).optional(),
});
export type AsistentePayload = z.infer<typeof AsistentePayloadSchema>;

/**
 * Registro de esquemas de payload por tipo. Solo se pueden encolar tipos con
 * esquema (evita meter payloads sin validar). Los demás tipos se añaden cuando se
 * implemente su módulo consumidor (M1/M2/M3).
 */
export const JOB_PAYLOAD_SCHEMAS = {
  consulta_rag: ConsultaRagPayloadSchema,
  proponer_contexto: ProponerContextoPayloadSchema,
  registrar_gasto: RegistrarGastoPayloadSchema,
  registrar_ingreso: RegistrarIngresoPayloadSchema,
  registrar_deuda: RegistrarDeudaPayloadSchema,
  marcar_pagado: MarcarPagadoPayloadSchema,
  asistente: AsistentePayloadSchema,
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

/** Ingreso: mismo contrato que gasto (propuesta de movimiento validada igual). */
export const RegistrarIngresoOutputSchema = RegistrarGastoOutputSchema;

/** Deuda: la IA propone un alta de deuda/pago; el usuario confirma. */
export const RegistrarDeudaOutputSchema = z.object({
  propuesta: CrearDeudaInputSchema.nullable(),
  nota: z.string().trim().max(500).optional(),
});
export type RegistrarDeudaOutput = z.infer<typeof RegistrarDeudaOutputSchema>;

/** Un movimiento elegible (id de Notion + nombre + importe) para marcar pagado. */
export const MovimientoElegidoSchema = z.object({
  id: z.string().trim().min(1),
  nombre: z.string().trim().min(1),
  importe: z.number(),
});
export type MovimientoElegido = z.infer<typeof MovimientoElegidoSchema>;

/**
 * Marcar pagado: la IA elige, de entre los movimientos PENDIENTES que se le pasan, cuál
 * marcar como pagado (devuelve su id de página de Notion). Si SOLO uno encaja → `movimiento`;
 * si VARIOS encajan → `candidatos` para que el usuario elija; si ninguno → null + `nota`.
 * El usuario confirma antes de ejecutar.
 */
export const MarcarPagadoOutputSchema = z.object({
  movimiento: MovimientoElegidoSchema.nullable(),
  candidatos: z.array(MovimientoElegidoSchema).max(8).default([]),
  nota: z.string().trim().max(500).optional(),
});
export type MarcarPagadoOutput = z.infer<typeof MarcarPagadoOutputSchema>;

/**
 * Acciones concretas que el router puede ejecutar (y a las que apunta cada opción de
 * "aclarar"). NO incluye "aclarar": una opción de desambiguación siempre resuelve a
 * una acción real.
 */
export const ACCIONES_ASISTENTE = ["responder", "gasto", "ingreso", "deuda", "pagado", "contexto"] as const;
export type AccionAsistente = (typeof ACCIONES_ASISTENTE)[number];

const NotaSchema = z.string().trim().max(500).optional();
const FuenteSchema = z.object({ id: z.string(), titulo: z.string() });

/** Objetivo de un borrado propuesto por la IA: un movimiento o una deuda, con su id de Notion. */
export const ObjetivoBorrarSchema = z.object({
  tipo: z.enum(["movimiento", "deuda"]),
  id: z.string().trim().min(1),
  nombre: z.string().trim().min(1),
});
export type ObjetivoBorrar = z.infer<typeof ObjetivoBorrarSchema>;

/**
 * Salida del router `asistente`: en UNA sola pasada el modelo clasifica la intención y
 * produce la propuesta correspondiente, o pide aclaración (`aclarar`) cuando el mensaje
 * podría interpretarse de más de una forma. Reutiliza los MISMOS sub-esquemas que las
 * acciones dedicadas, así la propuesta es directamente confirmable. La IA nunca escribe:
 * cada propuesta se confirma luego (gobernanza "propone → aprueba → crea").
 */
export const AsistenteOutputSchema = z.discriminatedUnion("accion", [
  z.object({ accion: z.literal("responder"), respuesta: z.string().trim().min(1), fuentes: z.array(FuenteSchema).default([]) }),
  z.object({ accion: z.literal("gasto"), propuesta: CrearMovimientoInputSchema.nullable(), nota: NotaSchema }),
  z.object({ accion: z.literal("ingreso"), propuesta: CrearMovimientoInputSchema.nullable(), nota: NotaSchema }),
  z.object({ accion: z.literal("deuda"), propuesta: CrearDeudaInputSchema.nullable(), nota: NotaSchema }),
  z.object({
    accion: z.literal("pagado"),
    movimiento: MovimientoElegidoSchema.nullable(),
    // Varios pendientes encajan (ej. "marca pagado un gasto de comida") → lista para elegir.
    candidatos: z.array(MovimientoElegidoSchema).max(8).default([]),
    nota: NotaSchema,
  }),
  z.object({
    accion: z.literal("borrar"),
    objetivo: ObjetivoBorrarSchema.nullable(),
    // Cuando varios encajan (ej. "un gasto de comida"), la IA los lista para que el
    // usuario elija; entonces objetivo va null. Si solo uno encaja claro, va en objetivo.
    candidatos: z.array(ObjetivoBorrarSchema).max(8).default([]),
    nota: NotaSchema,
  }),
  z.object({ accion: z.literal("contexto"), borradores: z.array(BorradorContextoSchema).min(1).max(5) }),
  // Herramientas de creación (cuenta/tarjeta/plan/presupuesto/recurrente). `propuesta` es un
  // objeto laxo (lo valida el esquema de la herramienta al confirmar). Si falta info → null + nota.
  z.object({
    accion: z.literal("herramienta"),
    herramienta: z.enum(HERRAMIENTAS),
    propuesta: z.record(z.string(), z.unknown()).nullable(),
    nota: NotaSchema,
  }),
  z.object({
    accion: z.literal("aclarar"),
    pregunta: z.string().trim().min(1).max(300),
    opciones: z
      .array(z.object({ etiqueta: z.string().trim().min(1).max(80), accion: z.enum(ACCIONES_ASISTENTE) }))
      .min(2)
      .max(4),
  }),
]);
export type AsistenteOutput = z.infer<typeof AsistenteOutputSchema>;

export const JOB_OUTPUT_SCHEMAS = {
  consulta_rag: ConsultaRagOutputSchema,
  proponer_contexto: ProponerContextoOutputSchema,
  registrar_gasto: RegistrarGastoOutputSchema,
  registrar_ingreso: RegistrarIngresoOutputSchema,
  registrar_deuda: RegistrarDeudaOutputSchema,
  marcar_pagado: MarcarPagadoOutputSchema,
  asistente: AsistenteOutputSchema,
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
