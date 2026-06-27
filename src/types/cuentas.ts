import { z } from "zod";

/**
 * Tipos de dominio de CUENTAS y TARJETAS (modelo financiero nativo, Supabase).
 * Una tarjeta de crédito es un saldo rotatorio (los cargos suben lo que debes; pagar el
 * extracto lo baja). Ver docs/modules/M1-finanzas.md §5.1.
 */

export const CUENTA_TIPOS = ["corriente", "ahorro", "efectivo"] as const;
export const TARJETA_TIPOS = ["debito", "credito"] as const;
export type CuentaTipo = (typeof CUENTA_TIPOS)[number];
export type TarjetaTipo = (typeof TARJETA_TIPOS)[number];

// --- Cuenta -----------------------------------------------------------------
export const CuentaSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  tipo: z.enum(CUENTA_TIPOS),
  saldoInicial: z.number(),
  activo: z.boolean(),
});
export type Cuenta = z.infer<typeof CuentaSchema>;

export const CrearCuentaInputSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  tipo: z.enum(CUENTA_TIPOS).default("corriente"),
  saldoInicial: z.number().default(0),
});
export type CrearCuentaInput = z.infer<typeof CrearCuentaInputSchema>;

// --- Tarjeta ----------------------------------------------------------------
export const TarjetaSchema = z.object({
  id: z.string(),
  cuentaId: z.string().nullable(),
  nombre: z.string(),
  tipo: z.enum(TARJETA_TIPOS),
  limite: z.number().nullable(),
  diaCorte: z.number().nullable(),
  diaPago: z.number().nullable(),
  activo: z.boolean(),
});
export type Tarjeta = z.infer<typeof TarjetaSchema>;

const diaMes = z.number().int().min(1).max(28);

/**
 * Alta de tarjeta. Para crédito, `limite`/`diaCorte`/`diaPago` son relevantes (opcionales);
 * para débito se ignoran. La cuenta a la que liquida es opcional.
 */
export const CrearTarjetaInputSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  tipo: z.enum(TARJETA_TIPOS),
  cuentaId: z.string().nullable().default(null),
  limite: z.number().positive().nullable().default(null),
  diaCorte: diaMes.nullable().default(null),
  diaPago: diaMes.nullable().default(null),
});
export type CrearTarjetaInput = z.infer<typeof CrearTarjetaInputSchema>;
