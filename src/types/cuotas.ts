import { z } from "zod";
import { CATEGORIAS, TIPOS } from "@/types/finanzas";

/**
 * Gastos a plazos (plan de cuotas). Una compra a crédito troceada en N cuotas mensuales;
 * el worker genera la cuota de cada mes como un movimiento. Ver docs/modules/M1-finanzas.md F-M1-8.
 */

export const ESTADOS_PLAN = ["activo", "completado", "cancelado"] as const;
export type EstadoPlan = (typeof ESTADOS_PLAN)[number];

export const PlanCuotasSchema = z.object({
  id: z.string(),
  tarjetaId: z.string().nullable(),
  concepto: z.string(),
  montoTotal: z.number(),
  numCuotas: z.number().int(),
  categoria: z.string(),
  tipo: z.string(),
  fechaInicio: z.string(), // ISO date
  diaFacturacion: z.number().int(),
  persona: z.string().nullable(),
  cuotasGeneradas: z.number().int(),
  estado: z.enum(ESTADOS_PLAN),
});
export type PlanCuotas = z.infer<typeof PlanCuotasSchema>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha ISO (YYYY-MM-DD)");

/** Alta de un plan de cuotas. La cuota 1 se genera al crear; el resto cada mes (worker). */
export const CrearPlanCuotasInputSchema = z.object({
  concepto: z.string().trim().min(1, "El concepto es obligatorio").max(200),
  montoTotal: z.number().positive("El total debe ser mayor que 0"),
  numCuotas: z.number().int().min(2, "Mínimo 2 cuotas").max(120),
  categoria: z.enum(CATEGORIAS),
  tipo: z.enum(TIPOS),
  fechaInicio: isoDate,
  diaFacturacion: z.number().int().min(1).max(28).default(1),
  tarjetaId: z.string().nullable().default(null),
  persona: z.string().trim().max(80).nullable().default(null),
});
export type CrearPlanCuotasInput = z.infer<typeof CrearPlanCuotasInputSchema>;
