import { describe, it, expect } from "vitest";
import {
  EntradaContextoInputSchema,
  EntradaContextoSchema,
  RecuperarContextoParamsSchema,
} from "@/types/contexto";

describe("EntradaContextoInputSchema", () => {
  const base = { tipo: "regla_financiera", titulo: "Mercadona", contenido: "es Comida" };

  it("normaliza fechas vacías a null y aplica defaults", () => {
    const r = EntradaContextoInputSchema.parse({ ...base, vigenteDesde: "", vigenteHasta: "" });
    expect(r.vigenteDesde).toBeNull();
    expect(r.vigenteHasta).toBeNull();
    expect(r.tags).toEqual([]);
    expect(r.estado).toBe("borrador");
  });

  it("acepta fechas ISO válidas", () => {
    const r = EntradaContextoInputSchema.parse({ ...base, vigenteDesde: "2026-01-01" });
    expect(r.vigenteDesde).toBe("2026-01-01");
  });

  it("rechaza título vacío", () => {
    const r = EntradaContextoInputSchema.safeParse({ ...base, titulo: "   " });
    expect(r.success).toBe(false);
  });

  it("rechaza tipo desconocido", () => {
    const r = EntradaContextoInputSchema.safeParse({ ...base, tipo: "inventado" });
    expect(r.success).toBe(false);
  });

  it("rechaza fecha con formato inválido", () => {
    const r = EntradaContextoInputSchema.safeParse({ ...base, vigenteDesde: "01/01/2026" });
    expect(r.success).toBe(false);
  });

  it("recorta y filtra tags vacíos", () => {
    const r = EntradaContextoInputSchema.parse({ ...base, tags: [" comida ", "", "casa"] });
    expect(r.tags).toEqual(["comida", "casa"]);
  });
});

describe("EntradaContextoSchema (DTO)", () => {
  it("valida una entrada completa de la DB", () => {
    const e = EntradaContextoSchema.parse({
      id: "11111111-1111-1111-1111-111111111111",
      tipo: "proveedor",
      titulo: "T",
      contenido: "C",
      tags: ["x"],
      vigenteDesde: null,
      vigenteHasta: null,
      estado: "publicado",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    expect(e.tipo).toBe("proveedor");
  });
});

describe("RecuperarContextoParamsSchema", () => {
  it("aplica k por defecto", () => {
    expect(RecuperarContextoParamsSchema.parse({}).k).toBe(8);
  });
  it("limita k al máximo permitido", () => {
    expect(RecuperarContextoParamsSchema.safeParse({ k: 999 }).success).toBe(false);
  });
});
