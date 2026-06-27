import { describe, it, expect } from "vitest";
import { fechasCuotas, importesCuotas, cuotasDebidas } from "./cuotas";

describe("fechasCuotas", () => {
  it("cuota 1 en fecha_inicio; el resto el día de facturación de los meses siguientes", () => {
    const f = fechasCuotas("2026-06-20", 4, 1);
    expect(f).toEqual(["2026-06-20", "2026-07-01", "2026-08-01", "2026-09-01"]);
  });

  it("rueda de año correctamente", () => {
    const f = fechasCuotas("2026-11-15", 4, 5);
    expect(f).toEqual(["2026-11-15", "2026-12-05", "2027-01-05", "2027-02-05"]);
  });
});

describe("importesCuotas", () => {
  it("reparto exacto (1000 / 10 = 100 cada una)", () => {
    const imp = importesCuotas(1000, 10);
    expect(imp).toHaveLength(10);
    expect(imp.every((x) => x === 100)).toBe(true);
    expect(imp.reduce((a, b) => a + b, 0)).toBe(1000);
  });

  it("la última cuota absorbe el redondeo (100 / 3)", () => {
    const imp = importesCuotas(100, 3);
    expect(imp).toEqual([33.33, 33.33, 33.34]);
    expect(imp.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5);
  });
});

describe("cuotasDebidas", () => {
  const fechas = ["2026-06-20", "2026-07-01", "2026-08-01", "2026-09-01"];
  it("cuenta las cuotas cuya fecha ya pasó", () => {
    expect(cuotasDebidas(fechas, "2026-06-25")).toBe(1);
    expect(cuotasDebidas(fechas, "2026-07-01")).toBe(2); // incluye la del día exacto
    expect(cuotasDebidas(fechas, "2026-12-31")).toBe(4); // todas
  });
  it("catch-up: si pasaron varias, las cuenta todas (el worker generará las que falten)", () => {
    expect(cuotasDebidas(fechas, "2026-08-15")).toBe(3);
  });
});
