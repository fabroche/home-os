import { z } from "zod";
import { CATEGORIAS } from "./finanzas";

/**
 * Presupuesto = tope mensual de gasto para una categoría (M1). Recurrente: aplica cada mes.
 * Único por categoría (se hace upsert al guardar). Ver docs/modules/M1-finanzas.md.
 */
export const PresupuestoSchema = z.object({
  id: z.string(),
  categoria: z.string(),
  monto: z.number(), // tope mensual, magnitud positiva
});
export type Presupuesto = z.infer<typeof PresupuestoSchema>;

/** Alta/edición de un presupuesto (upsert por categoría). */
export const CrearPresupuestoInputSchema = z.object({
  categoria: z.enum(CATEGORIAS),
  monto: z.number().positive("El tope debe ser mayor que 0"),
});
export type CrearPresupuestoInput = z.infer<typeof CrearPresupuestoInputSchema>;
