import { z } from "zod";
import { CATEGORIAS, TIPOS } from "./finanzas";

/**
 * Gasto recurrente = movimiento que se repite cada mes (alquiler, suscripciones). El worker
 * genera un `movimiento` el `diaMes` de cada mes desde `fechaInicio`. Ver M1-finanzas.
 */
export const GastoRecurrenteSchema = z.object({
  id: z.string(),
  concepto: z.string(),
  monto: z.number(), // magnitud positiva; el signo lo aplica el tipo
  categoria: z.string(),
  tipo: z.string(),
  diaMes: z.number(),
  fechaInicio: z.string(),
  cuentaId: z.string().nullable().optional(),
  tarjetaId: z.string().nullable().optional(),
  persona: z.string().nullable().optional(),
  ultimaGenerada: z.string().nullable().optional(),
  activo: z.boolean(),
});
export type GastoRecurrente = z.infer<typeof GastoRecurrenteSchema>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha ISO (YYYY-MM-DD)");

/** Alta de un gasto recurrente. */
export const CrearGastoRecurrenteInputSchema = z.object({
  concepto: z.string().trim().min(1, "El concepto es obligatorio").max(200),
  monto: z.number().positive("El importe debe ser mayor que 0"), // magnitud
  categoria: z.enum(CATEGORIAS),
  tipo: z.enum(TIPOS),
  diaMes: z.number().int().min(1, "El día debe estar entre 1 y 28").max(28, "El día debe estar entre 1 y 28"),
  fechaInicio: isoDate,
  cuentaId: z.string().nullable().optional(),
  tarjetaId: z.string().nullable().optional(),
  persona: z.string().trim().max(80).nullable().optional(),
});
export type CrearGastoRecurrenteInput = z.infer<typeof CrearGastoRecurrenteInputSchema>;
