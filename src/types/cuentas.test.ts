import { describe, it, expect } from "vitest";
import { CrearTarjetaInputSchema } from "./cuentas";

const base = { nombre: "Visa", tipo: "credito" as const };

describe("CrearTarjetaInputSchema · límite", () => {
  it("un límite de 0 significa 'sin límite' → null (no es error)", () => {
    const r = CrearTarjetaInputSchema.safeParse({ ...base, limite: 0 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.limite).toBeNull();
  });

  it("sin límite (undefined) → null por defecto", () => {
    const r = CrearTarjetaInputSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.limite).toBeNull();
  });

  it("un límite positivo se conserva", () => {
    const r = CrearTarjetaInputSchema.safeParse({ ...base, limite: 2000 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.limite).toBe(2000);
  });

  it("un límite negativo falla con mensaje en español", () => {
    const r = CrearTarjetaInputSchema.safeParse({ ...base, limite: -5 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toMatch(/mayor que 0/i);
  });
});

describe("CrearTarjetaInputSchema · días de corte/pago", () => {
  it("un día válido (1–28) se conserva", () => {
    const r = CrearTarjetaInputSchema.safeParse({ ...base, diaCorte: 15, diaPago: 1 });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.diaCorte).toBe(15);
      expect(r.data.diaPago).toBe(1);
    }
  });

  it("un día 0 o fuera de rango falla con mensaje en español", () => {
    const cero = CrearTarjetaInputSchema.safeParse({ ...base, diaCorte: 0 });
    expect(cero.success).toBe(false);
    if (!cero.success) expect(cero.error.issues[0]?.message).toMatch(/entre 1 y 28/i);

    const alto = CrearTarjetaInputSchema.safeParse({ ...base, diaPago: 31 });
    expect(alto.success).toBe(false);
    if (!alto.success) expect(alto.error.issues[0]?.message).toMatch(/entre 1 y 28/i);
  });
});
