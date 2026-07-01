/**
 * Lógica pura de gastos recurrentes (sin I/O → testeable). Calcula qué meses deben generarse
 * a día de hoy, evitando duplicados vía `ultimaGenerada`. Análogo a lib/finanzas/cuotas.ts.
 */

export type MesDebido = { mes: string; fecha: string };

/** El mes YYYY-MM siguiente a `ym`. */
export function siguienteMes(ym: string): string {
  const partes = ym.split("-").map(Number);
  const y = partes[0] ?? 0;
  const m = partes[1] ?? 1; // 1-based; como índice 0-based apunta al mes SIGUIENTE
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Meses que deben generarse para un recurrente a fecha `hoy`: desde el mes de `fechaInicio`
 * (o el siguiente al último generado) hasta el mes en curso, incluyendo un mes solo si su
 * fecha de cargo (`YYYY-MM-diaMes`) ya llegó (≤ hoy) y no es anterior a `fechaInicio`.
 */
export function recurrentesDebidos(
  fechaInicio: string,
  diaMes: number,
  ultimaGenerada: string | null,
  hoy: string,
): MesDebido[] {
  const inicioYM = fechaInicio.slice(0, 7);
  const hoyYM = hoy.slice(0, 7);
  const dd = String(diaMes).padStart(2, "0");

  let ym = ultimaGenerada && ultimaGenerada >= inicioYM ? siguienteMes(ultimaGenerada) : inicioYM;
  const out: MesDebido[] = [];
  let guard = 0;
  while (ym <= hoyYM && guard++ < 1200) {
    const fecha = `${ym}-${dd}`;
    if (fecha >= fechaInicio && fecha <= hoy) out.push({ mes: ym, fecha });
    ym = siguienteMes(ym);
  }
  return out;
}
