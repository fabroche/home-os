import { describe, it, expect } from "vitest";
import {
  firmarImporte,
  firmarValorDeuda,
  flujoDeTipo,
  CrearMovimientoInputSchema,
  CrearDeudaInputSchema,
} from "@/types/finanzas";

describe("firmarImporte", () => {
  it("gastos y deudas en negativo, ingresos en positivo (desde magnitud)", () => {
    expect(firmarImporte(100, "gasto")).toBe(-100);
    expect(firmarImporte(100, "deuda")).toBe(-100);
    expect(firmarImporte(100, "ingreso")).toBe(100);
  });
  it("normaliza una magnitud ya negativa", () => {
    expect(firmarImporte(-50, "gasto")).toBe(-50);
    expect(firmarImporte(-50, "ingreso")).toBe(50);
  });
});

describe("firmarValorDeuda", () => {
  it("deuda resta (negativo), pago suma (positivo)", () => {
    expect(firmarValorDeuda(450, "deuda")).toBe(-450);
    expect(firmarValorDeuda(100, "pago")).toBe(100);
  });
});

describe("flujoDeTipo (coherencia con la firma)", () => {
  it("clasifica el tipo de Notion", () => {
    expect(flujoDeTipo("Gasto Fijo")).toBe("gasto");
    expect(flujoDeTipo("Ingreso Variable")).toBe("ingreso");
    expect(flujoDeTipo("Deuda")).toBe("deuda");
  });
});

describe("CrearMovimientoInputSchema", () => {
  const base = {
    nombre: "Alquiler",
    importe: 700,
    tipo: "Gasto Fijo",
    categoria: "Casa",
    fecha: "2026-06-01",
  };
  it("aplica estado por defecto Pending", () => {
    expect(CrearMovimientoInputSchema.parse(base).estado).toBe("Pending");
  });
  it("rechaza importe <= 0", () => {
    expect(CrearMovimientoInputSchema.safeParse({ ...base, importe: 0 }).success).toBe(false);
  });
  it("rechaza categoría/tipo fuera de catálogo", () => {
    expect(CrearMovimientoInputSchema.safeParse({ ...base, categoria: "X" }).success).toBe(false);
    expect(CrearMovimientoInputSchema.safeParse({ ...base, tipo: "X" }).success).toBe(false);
  });
});

describe("CrearDeudaInputSchema", () => {
  const base = { concepto: "Préstamo", persona: "Leo", valor: 200, movimiento: "deuda", fecha: "2026-06-01" };
  it("acepta deuda y pago", () => {
    expect(CrearDeudaInputSchema.parse(base).movimiento).toBe("deuda");
    expect(CrearDeudaInputSchema.parse({ ...base, movimiento: "pago" }).movimiento).toBe("pago");
  });
  it("rechaza movimiento inválido y valor no positivo", () => {
    expect(CrearDeudaInputSchema.safeParse({ ...base, movimiento: "otro" }).success).toBe(false);
    expect(CrearDeudaInputSchema.safeParse({ ...base, valor: -1 }).success).toBe(false);
  });
});
