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
  facturas: z.array(z.string()), // URLs de la factura (Notion `invoices`)
  comprobantes: z.array(z.string()).default([]), // URLs del comprobante de pago (Notion `comprobante`)
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

/**
 * Firma el importe de un movimiento según su flujo (convención D13): gastos y
 * deudas en NEGATIVO, ingresos en POSITIVO. La UI pide siempre una magnitud > 0.
 */
export function firmarImporte(magnitud: number, flujo: Flujo): number {
  const abs = Math.abs(magnitud);
  return flujo === "ingreso" ? abs : -abs;
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha ISO (YYYY-MM-DD)");

/** Alta de un movimiento (gasto/ingreso) desde la app → se escribe en Notion. */
export const CrearMovimientoInputSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  importe: z.number().positive("El importe debe ser mayor que 0"), // magnitud
  categoria: z.enum(CATEGORIAS),
  tipo: z.enum(TIPOS),
  fecha: isoDate,
  estado: z.enum(ESTADOS).default("Pending"),
});
export type CrearMovimientoInput = z.infer<typeof CrearMovimientoInputSchema>;

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

/**
 * Alta de un movimiento de deuda desde la app → se escribe en Notion.
 * `movimiento`: "deuda" resta (valor negativo) y "pago" suma (valor positivo),
 * según tu convención (la deuda se registra negativa y los pagos positivos).
 */
export const CrearDeudaInputSchema = z.object({
  concepto: z.string().trim().min(1, "El concepto es obligatorio").max(200),
  persona: z.string().trim().min(1, "La persona es obligatoria"),
  valor: z.number().positive("El valor debe ser mayor que 0"), // magnitud
  movimiento: z.enum(["deuda", "pago"]),
  fecha: isoDate,
});
export type CrearDeudaInput = z.infer<typeof CrearDeudaInputSchema>;

/** Firma el valor de un movimiento de deuda: deuda negativa, pago positivo. */
export function firmarValorDeuda(magnitud: number, movimiento: "deuda" | "pago"): number {
  const abs = Math.abs(magnitud);
  return movimiento === "pago" ? abs : -abs;
}
