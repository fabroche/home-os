/**
 * Lógica PURA de gastos a plazos (sin I/O → testeable). Calcula las fechas de cada cuota,
 * el reparto de importes (la última absorbe el redondeo) y cuántas cuotas deberían existir
 * a una fecha dada (para que el worker genere las que falten, con catch-up e idempotencia).
 */

/**
 * Fechas (ISO) de cada cuota. La cuota 1 cae en `fechaInicio` (compra/primer pago); el resto,
 * el `diaFacturacion` (1..28, sin desbordes de mes) de los meses siguientes.
 */
export function fechasCuotas(fechaInicio: string, numCuotas: number, diaFacturacion: number): string[] {
  const [y = 0, m = 1] = fechaInicio.split("-").map(Number);
  const fechas = [fechaInicio];
  const dd = String(diaFacturacion).padStart(2, "0");
  for (let k = 1; k < numCuotas; k++) {
    const total = m - 1 + k; // mes 0-indexado + k
    const year = y + Math.floor(total / 12);
    const month = (total % 12) + 1;
    fechas.push(`${year}-${String(month).padStart(2, "0")}-${dd}`);
  }
  return fechas;
}

/** Reparte el total en N cuotas (2 decimales); la última absorbe el sobrante del redondeo. */
export function importesCuotas(montoTotal: number, numCuotas: number): number[] {
  const cent = (n: number) => Math.round(n * 100) / 100;
  const base = cent(montoTotal / numCuotas);
  const arr = Array<number>(numCuotas).fill(base);
  arr[numCuotas - 1] = cent(montoTotal - base * (numCuotas - 1));
  return arr;
}

/** Cuántas cuotas deberían existir a la fecha `hoy` (ISO). Las fechas ISO comparan léxico. */
export function cuotasDebidas(fechas: string[], hoy: string): number {
  return fechas.filter((f) => f <= hoy).length;
}
