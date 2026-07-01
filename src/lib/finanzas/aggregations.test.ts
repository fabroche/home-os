import { describe, it, expect } from "vitest";
import {
  resumen,
  gastosPorCategoria,
  ingresosPorCategoria,
  porMes,
  resumenDeudas,
  balancePorCuenta,
  aPagarPorTarjeta,
  extractoPorTarjeta,
  porCobrarDeTarjetas,
  gastoPorPersona,
  presupuestoVsGasto,
  costoDeVida,
  SIN_PERSONA,
} from "./aggregations";
import type { Presupuesto } from "@/types/presupuestos";
import type { Movimiento, Deuda } from "@/types/finanzas";
import type { Cuenta, Tarjeta } from "@/types/cuentas";

function mov(flujo: Movimiento["flujo"], importe: number | null): Movimiento {
  return {
    id: Math.random().toString(36),
    notionPageId: Math.random().toString(36),
    nombre: "x",
    fecha: "2026-06-01",
    importe,
    categoria: null,
    tipo: null,
    estado: null,
    facturas: [],
    comprobantes: [],
    flujo,
    ultimaEdicion: "2026-06-01T00:00:00.000Z",
  };
}

describe("resumen", () => {
  it("calcula el balance como suma firmada y las magnitudes en positivo", () => {
    const r = resumen([
      mov("ingreso", 1000),
      mov("gasto", -300), // los gastos vienen firmados en negativo desde Notion
      mov("gasto", -200),
      mov("deuda", -100),
    ]);
    expect(r.ingresos).toBe(1000);
    expect(r.gastos).toBe(500);
    expect(r.deudas).toBe(100);
    expect(r.balance).toBe(400); // 1000 - 300 - 200 - 100
    expect(r.total).toBe(4);
  });

  it("tolera importes nulos", () => {
    const r = resumen([mov("ingreso", null), mov("gasto", -50)]);
    expect(r.balance).toBe(-50);
    expect(r.ingresos).toBe(0);
  });
});

function movCF(flujo: Movimiento["flujo"], importe: number, categoria: string | null, fecha: string | null): Movimiento {
  return { ...mov(flujo, importe), categoria, fecha };
}

describe("gastosPorCategoria", () => {
  it("agrupa gastos por categoría (magnitud) y ordena desc; ignora ingresos", () => {
    const r = gastosPorCategoria([
      movCF("gasto", -30, "Comida", "2026-06-01"),
      movCF("gasto", -70, "Casa", "2026-06-01"),
      movCF("gasto", -20, "Comida", "2026-06-02"),
      movCF("ingreso", 1000, "Salario", "2026-06-01"),
      movCF("gasto", -10, null, "2026-06-01"),
    ]);
    expect(r[0]).toEqual({ categoria: "Casa", total: 70 });
    expect(r[1]).toEqual({ categoria: "Comida", total: 50 });
    expect(r.find((x) => x.categoria === "Sin categoría")?.total).toBe(10);
    expect(r.some((x) => x.categoria === "Salario")).toBe(false);
  });
});

describe("ingresosPorCategoria", () => {
  it("agrupa ingresos por categoría/fuente (magnitud) y ordena desc; ignora gastos", () => {
    const r = ingresosPorCategoria([
      movCF("ingreso", 1500, "Salario", "2026-06-01"),
      movCF("ingreso", 300, "Desarrollo", "2026-06-05"),
      movCF("ingreso", 200, "Salario", "2026-06-15"),
      movCF("gasto", -70, "Casa", "2026-06-01"),
      movCF("ingreso", 40, null, "2026-06-01"),
    ]);
    expect(r[0]).toEqual({ categoria: "Salario", total: 1700 });
    expect(r[1]).toEqual({ categoria: "Desarrollo", total: 300 });
    expect(r.find((x) => x.categoria === "Sin categoría")?.total).toBe(40);
    expect(r.some((x) => x.categoria === "Casa")).toBe(false);
  });
});

describe("porMes", () => {
  it("agrega ingresos/gastos/balance por mes y ordena desc", () => {
    const r = porMes([
      movCF("ingreso", 1000, null, "2026-06-10"),
      movCF("gasto", -200, null, "2026-06-15"),
      movCF("gasto", -50, null, "2026-05-01"),
    ]);
    expect(r[0]?.mes).toBe("2026-06");
    expect(r[0]).toMatchObject({ ingresos: 1000, gastos: 200, balance: 800 });
    expect(r[1]).toMatchObject({ mes: "2026-05", gastos: 50, balance: -50 });
  });
});

function deuda(valor: number | null, persona: string | null): Deuda {
  return {
    id: Math.random().toString(36),
    notionPageId: Math.random().toString(36),
    concepto: "x",
    fechaCreacion: "2026-06-01",
    valor,
    persona,
    ultimaEdicion: "2026-06-01T00:00:00.000Z",
  };
}

describe("resumenDeudas", () => {
  it("calcula el saldo pendiente como neto por persona (deuda negativa + pagos positivos)", () => {
    const r = resumenDeudas([
      deuda(-450, "Tia Anay"), // deuda inicial
      deuda(100, "Tia Anay"), // pago
      deuda(100, "Tia Anay"), // pago → neto -250
      deuda(-100, "Leo"),
      deuda(50, "Leo"), // neto -50
    ]);
    expect(r.total).toBe(300); // 250 + 50
    expect(r.totalPorCobrar).toBe(0);
    expect(r.porPersona[0]).toEqual({ persona: "Tia Anay", total: 250 });
    expect(r.porPersona.find((p) => p.persona === "Leo")?.total).toBe(50);
  });

  it("no cuenta como deuda lo que queda a tu favor (neto positivo = por cobrar)", () => {
    const r = resumenDeudas([
      deuda(-100, "Guille"),
      deuda(150, "Guille"), // neto +50 → te debe a ti
    ]);
    expect(r.total).toBe(0);
    expect(r.totalPorCobrar).toBe(50);
    expect(r.porCobrar[0]).toEqual({ persona: "Guille", total: 50 });
    expect(r.porPersona).toHaveLength(0);
  });

  it("una deuda saldada (neto 0) no aparece en ningún lado", () => {
    const r = resumenDeudas([deuda(-200, "Leo"), deuda(200, "Leo")]);
    expect(r.total).toBe(0);
    expect(r.totalPorCobrar).toBe(0);
    expect(r.porPersona).toHaveLength(0);
    expect(r.porCobrar).toHaveLength(0);
  });
});

const cuenta = (id: string, saldoInicial: number): Cuenta => ({
  id,
  nombre: id,
  tipo: "corriente",
  saldoInicial,
  activo: true,
});
const tarjeta = (id: string, tipo: Tarjeta["tipo"]): Tarjeta => ({
  id,
  cuentaId: null,
  nombre: id,
  tipo,
  limite: null,
  diaCorte: null,
  diaPago: null,
  activo: true,
});

describe("balancePorCuenta", () => {
  it("suma saldo inicial + movimientos firmados de esa cuenta", () => {
    const movs: Movimiento[] = [
      { ...mov("gasto", -50), cuentaId: "c1" },
      { ...mov("ingreso", 200), cuentaId: "c1" },
      { ...mov("gasto", -30), cuentaId: "c2" },
      { ...mov("gasto", -999), cuentaId: null }, // sin cuenta → no cuenta para ninguna
    ];
    const r = balancePorCuenta(movs, [cuenta("c1", 100), cuenta("c2", 0)]);
    expect(r.find((x) => x.cuenta.id === "c1")!.balance).toBe(250); // 100 - 50 + 200
    expect(r.find((x) => x.cuenta.id === "c2")!.balance).toBe(-30);
  });
});

describe("aPagarPorTarjeta", () => {
  it("suma cargos NO liquidados de tarjetas de crédito (ignora débito y liquidados)", () => {
    const movs: Movimiento[] = [
      { ...mov("gasto", -100), tarjetaId: "tc" },
      { ...mov("gasto", -40), tarjetaId: "tc", liquidadoAt: "2026-06-01T00:00:00.000Z" }, // liquidado → no cuenta
      { ...mov("gasto", -25), tarjetaId: "td" }, // débito → no aparece
    ];
    const r = aPagarPorTarjeta(movs, [tarjeta("tc", "credito"), tarjeta("td", "debito")]);
    expect(r).toHaveLength(1);
    expect(r[0]!.tarjeta.id).toBe("tc");
    expect(r[0]!.total).toBe(100);
  });
});

describe("extractoPorTarjeta", () => {
  it("total pendiente + desglose por persona (sin persona → bucket 'Tú'), solo crédito no liquidado", () => {
    const movs: Movimiento[] = [
      { ...mov("gasto", -300), tarjetaId: "tc", persona: "Leo" },
      { ...mov("gasto", -500), tarjetaId: "tc", persona: "Pareja" },
      { ...mov("gasto", -200), tarjetaId: "tc" }, // sin persona → bucket propio
      { ...mov("gasto", -40), tarjetaId: "tc", liquidadoAt: "2026-06-01T00:00:00.000Z" }, // liquidado → fuera
      { ...mov("gasto", -25), tarjetaId: "td" }, // débito → ignora
    ];
    const r = extractoPorTarjeta(movs, [tarjeta("tc", "credito"), tarjeta("td", "debito")]);
    expect(r).toHaveLength(1);
    expect(r[0]!.total).toBe(1000); // 300 + 500 + 200
    expect(r[0]!.porPersona[0]).toEqual({ persona: "Pareja", total: 500 });
    expect(r[0]!.porPersona.find((p) => p.persona === SIN_PERSONA)?.total).toBe(200);
  });
});

describe("porCobrarDeTarjetas", () => {
  it("agrupa por persona los cargos de crédito no liquidados atribuidos a otros (ignora bucket propio, débito y liquidados)", () => {
    const movs: Movimiento[] = [
      { ...mov("gasto", -500), tarjetaId: "tc", persona: "Pareja" },
      { ...mov("gasto", -200), tarjetaId: "tc", persona: "Pareja" },
      { ...mov("gasto", -300), tarjetaId: "tc" }, // sin persona → no cobrar
      { ...mov("gasto", -100), tarjetaId: "tc", persona: "Pareja", liquidadoAt: "2026-06-01T00:00:00.000Z" }, // liquidado → fuera
      { ...mov("gasto", -30), tarjetaId: "td", persona: "Leo" }, // débito → fuera
    ];
    const r = porCobrarDeTarjetas(movs, [tarjeta("tc", "credito"), tarjeta("td", "debito")]);
    expect(r).toEqual([{ persona: "Pareja", total: 700 }]);
  });
});

describe("gastoPorPersona", () => {
  it("agrupa gasto por persona; filtra por tarjeta si se indica", () => {
    const movs: Movimiento[] = [
      { ...mov("gasto", -300), persona: "Yo", tarjetaId: "tc" },
      { ...mov("gasto", -500), persona: "Pareja", tarjetaId: "tc" },
      { ...mov("gasto", -50), persona: "Yo", tarjetaId: "otra" },
      { ...mov("ingreso", 1000), persona: "Yo" }, // ingreso no cuenta
      { ...mov("gasto", -10), persona: null }, // sin persona → ignora
    ];
    const global = gastoPorPersona(movs);
    expect(global[0]).toEqual({ persona: "Pareja", total: 500 });
    expect(global.find((x) => x.persona === "Yo")!.total).toBe(350);

    const enTarjeta = gastoPorPersona(movs, "tc");
    expect(enTarjeta).toEqual([
      { persona: "Pareja", total: 500 },
      { persona: "Yo", total: 300 },
    ]);
  });
});

const presupuesto = (categoria: string, monto: number): Presupuesto => ({ id: categoria, categoria, monto });

describe("presupuestoVsGasto", () => {
  it("suma el gasto del mes por categoría, calcula % y marca excedido; ordena por % desc", () => {
    const movs = [
      movCF("gasto", -120, "Comida", "2026-07-05"),
      movCF("gasto", -80, "Comida", "2026-07-20"),
      movCF("gasto", -50, "Comida", "2026-06-30"), // otro mes → no cuenta
      movCF("gasto", -900, "Casa", "2026-07-01"),
      movCF("ingreso", 1000, "Comida", "2026-07-10"), // ingreso → no cuenta
    ];
    const r = presupuestoVsGasto(movs, [presupuesto("Comida", 250), presupuesto("Casa", 800)], "2026-07");

    const comida = r.find((x) => x.categoria === "Comida")!;
    expect(comida.gastado).toBe(200);
    expect(comida.pct).toBe(80);
    expect(comida.excedido).toBe(false);

    const casa = r.find((x) => x.categoria === "Casa")!;
    expect(casa.gastado).toBe(900);
    expect(casa.excedido).toBe(true);

    expect(r[0]!.categoria).toBe("Casa"); // 112% antes que 80%
  });
});

describe("costoDeVida", () => {
  const gasto = (importe: number, tipo: string, fecha: string): Movimiento => ({
    ...movCF("gasto", importe, "Casa", fecha),
    tipo,
  });

  it("promedia el gasto de los meses previos con datos y separa fijos/variables", () => {
    const movs = [
      gasto(-800, "Gasto Fijo", "2026-06-01"),
      gasto(-200, "Gasto Variable", "2026-06-15"),
      gasto(-800, "Gasto Fijo", "2026-05-01"),
      gasto(-300, "Gasto Variable", "2026-05-20"),
      gasto(-100, "Gasto Variable", "2026-07-03"), // mes actual → fuera de la ventana
      gasto(-50, "Gasto Fijo", "2026-03-01"), // anterior a la ventana → fuera
    ];
    const r = costoDeVida(movs, "2026-07", 3); // ventana: 06, 05, 04 → con datos: 06, 05
    expect(r.meses).toBe(2);
    expect(r.fijos).toBe(800); // 1600 / 2
    expect(r.variables).toBe(250); // 500 / 2
    expect(r.mensual).toBe(1050); // 2100 / 2
  });

  it("sin datos en la ventana → todo 0", () => {
    const r = costoDeVida([gasto(-100, "Gasto Fijo", "2026-07-05")], "2026-07", 3);
    expect(r).toEqual({ mensual: 0, fijos: 0, variables: 0, meses: 0 });
  });
});
