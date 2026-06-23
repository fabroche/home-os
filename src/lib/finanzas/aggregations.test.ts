import { describe, it, expect } from "vitest";
import { resumen, gastosPorCategoria, ingresosPorCategoria, porMes, resumenDeudas } from "./aggregations";
import type { Movimiento, Deuda } from "@/types/finanzas";

function mov(flujo: Movimiento["flujo"], importe: number | null): Movimiento {
  return {
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
