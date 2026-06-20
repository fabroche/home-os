import type { Movimiento, Deuda } from "@/types/finanzas";

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

export type CategoriaTotal = { categoria: string; total: number };

/** Gastos (magnitud) agrupados por categoría, de mayor a menor. */
export function gastosPorCategoria(movs: Movimiento[]): CategoriaTotal[] {
  const acc = new Map<string, number>();
  for (const m of movs) {
    if (m.flujo !== "gasto") continue;
    const cat = m.categoria ?? "Sin categoría";
    acc.set(cat, (acc.get(cat) ?? 0) + Math.abs(m.importe ?? 0));
  }
  return [...acc.entries()]
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total);
}

export type MesResumen = { mes: string; ingresos: number; gastos: number; balance: number };

/** Resumen por mes (YYYY-MM), de más reciente a más antiguo. Ignora sin fecha. */
export function porMes(movs: Movimiento[]): MesResumen[] {
  const acc = new Map<string, { ingresos: number; gastos: number; balance: number }>();
  for (const m of movs) {
    if (!m.fecha) continue;
    const mes = m.fecha.slice(0, 7);
    const row = acc.get(mes) ?? { ingresos: 0, gastos: 0, balance: 0 };
    const imp = m.importe ?? 0;
    if (m.flujo === "ingreso") row.ingresos += Math.abs(imp);
    else if (m.flujo === "gasto") row.gastos += Math.abs(imp);
    row.balance += imp;
    acc.set(mes, row);
  }
  return [...acc.entries()]
    .map(([mes, v]) => ({ mes, ...v }))
    .sort((a, b) => b.mes.localeCompare(a.mes));
}

export type DeudasResumen = {
  total: number;
  porPersona: { persona: string; total: number }[];
};

/** Total de deudas (magnitud) y desglose por persona. */
export function resumenDeudas(deudas: Deuda[]): DeudasResumen {
  const acc = new Map<string, number>();
  let total = 0;
  for (const d of deudas) {
    const v = Math.abs(d.valor ?? 0);
    total += v;
    const persona = d.persona ?? "—";
    acc.set(persona, (acc.get(persona) ?? 0) + v);
  }
  return {
    total,
    porPersona: [...acc.entries()]
      .map(([persona, t]) => ({ persona, total: t }))
      .sort((a, b) => b.total - a.total),
  };
}
