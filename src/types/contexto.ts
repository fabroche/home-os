import { z } from "zod";

/**
 * Tipos de DOMINIO del Banco de contexto (M4). El conocimiento personal que la IA
 * recupera para acertar (reglas, proveedores, preferencias, contactos, FAQ).
 */

export const TIPOS_CONTEXTO = [
  "regla_financiera",
  "proveedor",
  "preferencia_viaje",
  "contacto",
  "faq",
  "otro",
] as const;
export type TipoContexto = (typeof TIPOS_CONTEXTO)[number];

export const ESTADOS_CONTEXTO = ["borrador", "publicado", "archivado"] as const;
export type EstadoContexto = (typeof ESTADOS_CONTEXTO)[number];

/** Etiquetas legibles para la UI (orden estable). */
export const TIPO_LABEL: Record<TipoContexto, string> = {
  regla_financiera: "Regla financiera",
  proveedor: "Proveedor",
  preferencia_viaje: "Preferencia de viaje",
  contacto: "Contacto",
  faq: "FAQ",
  otro: "Otro",
};

const isoDateOrNull = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha ISO (YYYY-MM-DD)")
  .nullable();

/** Fecha venida de un <input type="date">: "" / undefined / null → null. */
const fechaFormulario = z
  .union([z.string(), z.undefined(), z.null()])
  .transform((s) => (s == null || s === "" ? null : s))
  .pipe(isoDateOrNull);

/** DTO completo de una entrada (lo que devuelve la lectura). */
export const EntradaContextoSchema = z.object({
  id: z.string().uuid(),
  tipo: z.enum(TIPOS_CONTEXTO),
  titulo: z.string(),
  contenido: z.string(),
  tags: z.array(z.string()),
  vigenteDesde: isoDateOrNull,
  vigenteHasta: isoDateOrNull,
  estado: z.enum(ESTADOS_CONTEXTO),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type EntradaContexto = z.infer<typeof EntradaContextoSchema>;

/**
 * Entrada de los formularios / Server Actions. `id` ausente = crear; presente = actualizar.
 * Las fechas vacías del form ("") se normalizan a null.
 */
export const EntradaContextoInputSchema = z.object({
  id: z.string().uuid().optional(),
  tipo: z.enum(TIPOS_CONTEXTO),
  titulo: z.string().trim().min(1, "El título es obligatorio").max(200),
  contenido: z.string().trim().min(1, "El contenido es obligatorio"),
  tags: z
    .array(z.string())
    .max(50)
    .default([])
    .transform((arr) => [...new Set(arr.map((t) => t.trim()).filter(Boolean))]),
  vigenteDesde: fechaFormulario,
  vigenteHasta: fechaFormulario,
  estado: z.enum(ESTADOS_CONTEXTO).default("borrador"),
});
export type EntradaContextoInput = z.infer<typeof EntradaContextoInputSchema>;

/** Parámetros de recuperación selectiva para la IA (M6 consume esto). */
export const RecuperarContextoParamsSchema = z.object({
  tipos: z.array(z.enum(TIPOS_CONTEXTO)).optional(),
  tags: z.array(z.string()).optional(),
  consulta: z.string().optional(),
  k: z.number().int().positive().max(50).default(8),
});
export type RecuperarContextoParams = z.input<typeof RecuperarContextoParamsSchema>;

/** Fragmento devuelto por la recuperación (texto + metadatos para trazabilidad). */
export type FragmentoContexto = {
  id: string;
  tipo: TipoContexto;
  titulo: string;
  contenido: string;
  tags: string[];
  score: number;
};
