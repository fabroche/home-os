import { describe, it, expect } from "vitest";
import { resumen } from "./aggregations";
import type { Movimiento } from "@/types/finanzas";

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
