import { describe, it, expect } from "vitest";
import { buildRpcArgs } from "@/lib/ai/context/retrieve";

const USER = "22222222-2222-2222-2222-222222222222";

describe("buildRpcArgs", () => {
  it("usa null para arrays vacíos y consulta en blanco (k por defecto)", () => {
    const a = buildRpcArgs(USER, { tipos: [], tags: [], consulta: "   " });
    expect(a).toEqual({
      p_user: USER,
      p_tipos: null,
      p_tags: null,
      p_consulta: null,
      p_k: 8,
    });
  });

  it("pasa filtros y recorta la consulta", () => {
    const a = buildRpcArgs(USER, {
      tipos: ["proveedor"],
      tags: ["comida"],
      consulta: "  mercadona ",
      k: 5,
    });
    expect(a.p_tipos).toEqual(["proveedor"]);
    expect(a.p_tags).toEqual(["comida"]);
    expect(a.p_consulta).toBe("mercadona");
    expect(a.p_k).toBe(5);
  });

  it("rechaza tipos inválidos (vía Zod)", () => {
    expect(() => buildRpcArgs(USER, { tipos: ["xxx" as never] })).toThrow();
  });
});
