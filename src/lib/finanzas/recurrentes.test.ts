import { describe, it, expect } from "vitest";
import { recurrentesDebidos, siguienteMes } from "./recurrentes";

describe("siguienteMes", () => {
  it("avanza un mes y cruza el año", () => {
    expect(siguienteMes("2026-06")).toBe("2026-07");
    expect(siguienteMes("2026-12")).toBe("2027-01");
  });
});

describe("recurrentesDebidos", () => {
  it("genera un mes por cada mes desde el inicio hasta hoy (sin ultimaGenerada)", () => {
    const r = recurrentesDebidos("2026-05-01", 1, null, "2026-07-10");
    expect(r.map((x) => x.mes)).toEqual(["2026-05", "2026-06", "2026-07"]);
    expect(r[0]).toEqual({ mes: "2026-05", fecha: "2026-05-01" });
  });

  it("no repite meses ya generados (catch-up desde ultimaGenerada)", () => {
    const r = recurrentesDebidos("2026-01-05", 5, "2026-05", "2026-07-10");
    expect(r.map((x) => x.mes)).toEqual(["2026-06", "2026-07"]);
  });

  it("no genera un mes cuya fecha de cargo aún no ha llegado", () => {
    // día 20; hoy es 2026-07-10 → julio aún no toca
    const r = recurrentesDebidos("2026-06-01", 20, null, "2026-07-10");
    expect(r.map((x) => x.mes)).toEqual(["2026-06"]);
    expect(r[0]!.fecha).toBe("2026-06-20");
  });

  it("no genera antes de fechaInicio aunque el día del mes ya pasara", () => {
    // inicio el 15; día 1 → el 2026-06-01 es anterior al inicio, se salta
    const r = recurrentesDebidos("2026-06-15", 1, null, "2026-07-10");
    expect(r.map((x) => x.mes)).toEqual(["2026-07"]);
  });

  it("sin nada debido devuelve vacío", () => {
    const r = recurrentesDebidos("2026-08-01", 1, null, "2026-07-10");
    expect(r).toEqual([]);
  });
});
