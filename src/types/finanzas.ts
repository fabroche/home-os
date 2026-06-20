import { z } from "zod";

/**
 * Tipos de DOMINIO de finanzas. Reflejan las DBs de Notion (Presupuesto, Deudas_Personales)
 * pero NO exponen el shape crudo de Notion (los mappers traducen).
 *
 * Validación lenient en select/status (string en vez de enum): un nuevo valor en Notion
 * no debe romper el sync. Las constantes de abajo son la referencia conocida para la UI.
 */

// --- DB "Presupuesto" --------------------------------------------------------
export const CATEGORIAS = [
  "Salario", "Casa", "Desarrollo", "Osio", "Confort", "Viaje",
  "Medicina", "Transporte", "Restaurantes", "Comida", "Deuda",
] as const;
export const TIPOS = [
  "Gasto Fijo", "Gasto Variable", "Gasto Hormiga", "Ingreso Fijo", "Ingreso Variable", "Deuda",
] as const;
export const ESTADOS = ["Pending", "Done"] as const;

export type Categoria = (typeof CATEGORIAS)[number];
export type Flujo = "ingreso" | "gasto" | "deuda";

export const MovimientoSchema = z.object({
  notionPageId: z.string(),
  nombre: z.string(),
  fecha: z.string().nullable(), // ISO date (YYYY-MM-DD)
  importe: z.number().nullable(), // euros
  categoria: z.string().nullable(),
  tipo: z.string().nullable(),
  estado: z.string().nullable(),
  facturas: z.array(z.string()), // URLs de archivos adjuntos en Notion
  flujo: z.enum(["ingreso", "gasto", "deuda"]),
  url: z.string().optional(),
  ultimaEdicion: z.string(),
});
export type Movimiento = z.infer<typeof MovimientoSchema>;

/** Deriva el flujo a partir del campo `type` de Notion. */
export function flujoDeTipo(tipo: string | null): Flujo {
  if (tipo?.startsWith("Ingreso")) return "ingreso";
  if (tipo === "Deuda") return "deuda";
  return "gasto";
}

// --- DB "Deudas_Personales" --------------------------------------------------
export const PERSONAS_DEUDA = ["Tia Anay", "RafaYDay", "Leo", "Guille"] as const;

export const DeudaSchema = z.object({
  notionPageId: z.string(),
  concepto: z.string(),
  fechaCreacion: z.string().nullable(),
  valor: z.number().nullable(),
  persona: z.string().nullable(),
  url: z.string().optional(),
  ultimaEdicion: z.string(),
});
export type Deuda = z.infer<typeof DeudaSchema>;
