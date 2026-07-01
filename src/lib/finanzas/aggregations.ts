import type { Movimiento, Deuda } from "@/types/finanzas";
import type { Cuenta, Tarjeta } from "@/types/cuentas";
import type { Presupuesto } from "@/types/presupuestos";

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

/** Agrupa la magnitud por categoría para un flujo dado, de mayor a menor. */
function agruparPorCategoria(movs: Movimiento[], flujo: Movimiento["flujo"]): CategoriaTotal[] {
  const acc = new Map<string, number>();
  for (const m of movs) {
    if (m.flujo !== flujo) continue;
    const cat = m.categoria ?? "Sin categoría";
    acc.set(cat, (acc.get(cat) ?? 0) + Math.abs(m.importe ?? 0));
  }
  return [...acc.entries()]
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total);
}

/** Gastos (magnitud) agrupados por categoría, de mayor a menor. */
export function gastosPorCategoria(movs: Movimiento[]): CategoriaTotal[] {
  return agruparPorCategoria(movs, "gasto");
}

/** Ingresos (magnitud) agrupados por categoría/fuente, de mayor a menor. */
export function ingresosPorCategoria(movs: Movimiento[]): CategoriaTotal[] {
  return agruparPorCategoria(movs, "ingreso");
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
  /** Saldo pendiente de pago (magnitud, suma de los netos negativos por persona). */
  total: number;
  /** A tu favor por cobrar (magnitud, suma de los netos positivos por persona). */
  totalPorCobrar: number;
  /** Pendiente por pagar, por persona (solo netos negativos), de mayor a menor. */
  porPersona: { persona: string; total: number }[];
  /** A favor por cobrar, por persona (solo netos positivos), de mayor a menor. */
  porCobrar: { persona: string; total: number }[];
};

/**
 * Saldo de deudas por persona. Convención de Notion (Deudas_Personales): la deuda se
 * registra en NEGATIVO y cada pago en POSITIVO con la misma persona; el neto con signo
 * es el saldo. Neto < 0 → aún debes (por pagar); neto > 0 → a tu favor (por cobrar).
 */
export function resumenDeudas(deudas: Deuda[]): DeudasResumen {
  const neto = new Map<string, number>();
  for (const d of deudas) {
    const persona = d.persona ?? "—";
    neto.set(persona, (neto.get(persona) ?? 0) + (d.valor ?? 0));
  }

  const porPersona: { persona: string; total: number }[] = [];
  const porCobrar: { persona: string; total: number }[] = [];
  let total = 0;
  let totalPorCobrar = 0;

  for (const [persona, raw] of neto) {
    const n = Math.round(raw * 100) / 100; // evita ruido de coma flotante en euros
    if (n < 0) {
      const pendiente = -n;
      total += pendiente;
      porPersona.push({ persona, total: pendiente });
    } else if (n > 0) {
      totalPorCobrar += n;
      porCobrar.push({ persona, total: n });
    }
    // n === 0 → deuda saldada, no aporta a ningún lado
  }

  porPersona.sort((a, b) => b.total - a.total);
  porCobrar.sort((a, b) => b.total - a.total);

  return { total, totalPorCobrar, porPersona, porCobrar };
}

// === Cuentas / tarjetas / persona (modelo nativo) ===========================

export type SaldoCuenta = { cuenta: Cuenta; balance: number };

/** Balance por cuenta = saldo inicial + suma firmada de los movimientos de esa cuenta. */
export function balancePorCuenta(movs: Movimiento[], cuentas: Cuenta[]): SaldoCuenta[] {
  return cuentas.map((cuenta) => {
    const suma = movs
      .filter((m) => m.cuentaId === cuenta.id)
      .reduce((acc, m) => acc + (m.importe ?? 0), 0);
    return { cuenta, balance: cuenta.saldoInicial + suma };
  });
}

export type APagarTarjeta = { tarjeta: Tarjeta; total: number };

/**
 * Cuánto se pagará de cada tarjeta de CRÉDITO = magnitud de sus cargos (gastos) aún NO
 * liquidados (`liquidadoAt` vacío). Al pagar el extracto (liquidar) dejan de sumar.
 */
export function aPagarPorTarjeta(movs: Movimiento[], tarjetas: Tarjeta[]): APagarTarjeta[] {
  return tarjetas
    .filter((t) => t.tipo === "credito")
    .map((tarjeta) => {
      const total = movs
        .filter((m) => m.tarjetaId === tarjeta.id && m.flujo === "gasto" && !m.liquidadoAt)
        .reduce((acc, m) => acc + Math.abs(m.importe ?? 0), 0);
      return { tarjeta, total };
    });
}

export type GastoPersona = { persona: string; total: number };

/** Etiqueta del bucket propio en un extracto (cargos sin persona asignada = tuyos). */
export const SIN_PERSONA = "Tú";

export type ExtractoTarjeta = {
  tarjeta: Tarjeta;
  /** Magnitud total pendiente de liquidar (lo que pagarás del extracto). */
  total: number;
  /** Descomposición por persona (los cargos sin persona van al bucket "Tú"), de mayor a menor. */
  porPersona: GastoPersona[];
};

/**
 * Extracto pendiente de cada tarjeta de CRÉDITO: total de cargos aún NO liquidados y su
 * descomposición por persona ("300€ tuyos, 500€ de tu pareja"). Los cargos sin persona van al
 * bucket propio (SIN_PERSONA). Al pagar el extracto (liquidar) los cargos dejan de contar.
 */
export function extractoPorTarjeta(movs: Movimiento[], tarjetas: Tarjeta[]): ExtractoTarjeta[] {
  return tarjetas
    .filter((t) => t.tipo === "credito")
    .map((tarjeta) => {
      const acc = new Map<string, number>();
      let total = 0;
      for (const m of movs) {
        if (m.tarjetaId !== tarjeta.id || m.flujo !== "gasto" || m.liquidadoAt) continue;
        const mag = Math.abs(m.importe ?? 0);
        const persona = m.persona?.trim() || SIN_PERSONA;
        acc.set(persona, (acc.get(persona) ?? 0) + mag);
        total += mag;
      }
      const porPersona = [...acc.entries()]
        .map(([persona, t]) => ({ persona, total: t }))
        .sort((a, b) => b.total - a.total);
      return { tarjeta, total, porPersona };
    });
}

/**
 * Puente persona↔deuda (derivado, sin FK todavía): lo que cada persona te debe por sus cargos
 * en tus tarjetas de CRÉDITO aún NO liquidados (tú los pagarás por ella). Ignora el bucket
 * propio (cargos sin persona). De mayor a menor. Para verse junto a `resumenDeudas().porCobrar`.
 */
export function porCobrarDeTarjetas(movs: Movimiento[], tarjetas: Tarjeta[]): GastoPersona[] {
  const credito = new Set(tarjetas.filter((t) => t.tipo === "credito").map((t) => t.id));
  const acc = new Map<string, number>();
  for (const m of movs) {
    if (m.flujo !== "gasto" || m.liquidadoAt) continue;
    if (!m.tarjetaId || !credito.has(m.tarjetaId)) continue;
    const persona = m.persona?.trim();
    if (!persona) continue;
    acc.set(persona, (acc.get(persona) ?? 0) + Math.abs(m.importe ?? 0));
  }
  return [...acc.entries()]
    .map(([persona, total]) => ({ persona, total }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Gasto (magnitud) por persona, de mayor a menor. Si se pasa `tarjetaId`, solo cuenta los
 * cargos de esa tarjeta (la descomposición de una tarjeta compartida). Ignora sin persona.
 */
export function gastoPorPersona(movs: Movimiento[], tarjetaId?: string): GastoPersona[] {
  const acc = new Map<string, number>();
  for (const m of movs) {
    if (m.flujo !== "gasto") continue;
    if (tarjetaId && m.tarjetaId !== tarjetaId) continue;
    const persona = m.persona?.trim();
    if (!persona) continue;
    acc.set(persona, (acc.get(persona) ?? 0) + Math.abs(m.importe ?? 0));
  }
  return [...acc.entries()]
    .map(([persona, total]) => ({ persona, total }))
    .sort((a, b) => b.total - a.total);
}

// === Presupuestos ===========================================================

export type PresupuestoItem = {
  id: string;
  categoria: string;
  /** Tope mensual. */
  tope: number;
  /** Gastado en esa categoría durante `mes` (magnitud). */
  gastado: number;
  /** Porcentaje del tope consumido (redondeado; puede pasar de 100). */
  pct: number;
  /** true si el gasto superó el tope. */
  excedido: boolean;
};

/**
 * Seguimiento de presupuestos para un mes (YYYY-MM): por cada tope, cuánto se ha gastado en
 * esa categoría de GASTO ese mes, el % consumido y si se excedió. Ordena por % descendente
 * (lo más apretado primero).
 */
export function presupuestoVsGasto(
  movs: Movimiento[],
  presupuestos: Presupuesto[],
  mes: string,
): PresupuestoItem[] {
  return presupuestos
    .map((p) => {
      const gastado = movs
        .filter((m) => m.flujo === "gasto" && m.categoria === p.categoria && (m.fecha ?? "").slice(0, 7) === mes)
        .reduce((acc, m) => acc + Math.abs(m.importe ?? 0), 0);
      const pct = p.monto > 0 ? Math.round((gastado / p.monto) * 100) : 0;
      return { id: p.id, categoria: p.categoria, tope: p.monto, gastado, pct, excedido: gastado > p.monto };
    })
    .sort((a, b) => b.pct - a.pct);
}
