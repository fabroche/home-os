import type { Movimiento } from "@/types/finanzas";

/**
 * Agregaciones PURAS sobre movimientos (sin I/O ni server-only → testeable).
 */
export type ResumenFinanzas = {
  ingresos: number; // magnitud positiva
  gastos: number; // magnitud positiva (en Notion los gastos vienen firmados en negativo)
  deudas: number; // magnitud positiva
  balance: number; // neto real = suma de TODOS los importes con su signo
  total: number;
};

export function resumen(movs: Movimiento[]): ResumenFinanzas {
  const sumaFlujo = (flujo: Movimiento["flujo"]) =>
    movs.filter((m) => m.flujo === flujo).reduce((acc, m) => acc + (m.importe ?? 0), 0);
  const balance = movs.reduce((acc, m) => acc + (m.importe ?? 0), 0);
  return {
    ingresos: Math.abs(sumaFlujo("ingreso")),
    gastos: Math.abs(sumaFlujo("gasto")),
    deudas: Math.abs(sumaFlujo("deuda")),
    balance,
    total: movs.length,
  };
}
