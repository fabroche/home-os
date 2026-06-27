import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests de la escritura NATIVA de finanzas (Fase B): la app inserta/actualiza directo en
 * Supabase con `origen='app'`, importe/valor firmados, y "adopta" (origen='app') al editar.
 * Se mockea el cliente Supabase: capturamos las filas de insert/update.
 */
const inserts: { tabla: string; row: Record<string, unknown> }[] = [];
const updates: { tabla: string; row: Record<string, unknown> }[] = [];
let singleData: Record<string, unknown> = { id: "new-id" };

function makeBuilder(tabla: string) {
  const b: Record<string, unknown> = {};
  b.insert = (row: Record<string, unknown>) => {
    inserts.push({ tabla, row });
    return b;
  };
  b.update = (row: Record<string, unknown>) => {
    updates.push({ tabla, row });
    return b;
  };
  b.select = () => b;
  b.eq = () => b;
  b.single = () => Promise.resolve({ data: singleData, error: null });
  b.then = (resolve: (v: { data: unknown; error: null }) => unknown) =>
    Promise.resolve({ data: null, error: null }).then(resolve);
  return b;
}
vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({ from: (t: string) => makeBuilder(t) }),
}));

import {
  crearMovimientoNativo,
  crearDeudaNativa,
  actualizarEstadoMovimiento,
  borrarMovimientoById,
  borrarDeudaById,
} from "@/lib/services/finanzas";

beforeEach(() => {
  inserts.length = 0;
  updates.length = 0;
  singleData = { id: "new-id" };
});

describe("escritura nativa de finanzas (Fase B)", () => {
  it("crearMovimientoNativo: gasto → origen='app', importe firmado negativo, flujo gasto", async () => {
    const id = await crearMovimientoNativo(
      { nombre: "Café", importe: 2.5, categoria: "Restaurantes", tipo: "Gasto Variable", fecha: "2026-06-27", estado: "Pending" },
      "user-1",
    );
    expect(id).toBe("new-id");
    expect(inserts[0]!.tabla).toBe("movimiento");
    expect(inserts[0]!.row).toMatchObject({
      origen: "app",
      user_id: "user-1",
      flujo: "gasto",
      importe: -2.5,
      estado: "Pending",
    });
  });

  it("crearMovimientoNativo: persiste etiquetas cuenta/tarjeta/persona", async () => {
    await crearMovimientoNativo(
      {
        nombre: "Sushi",
        importe: 21,
        categoria: "Restaurantes",
        tipo: "Gasto Variable",
        fecha: "2026-06-27",
        estado: "Pending",
        cuentaId: "c1",
        tarjetaId: "t1",
        persona: "Ana",
      },
      "u",
    );
    expect(inserts[0]!.row).toMatchObject({ cuenta_id: "c1", tarjeta_id: "t1", persona: "Ana" });
  });

  it("crearMovimientoNativo: ingreso → importe positivo, flujo ingreso", async () => {
    await crearMovimientoNativo(
      { nombre: "Sueldo", importe: 1500, categoria: "Salario", tipo: "Ingreso Fijo", fecha: "2026-06-27", estado: "Pending" },
      "user-1",
    );
    expect(inserts[0]!.row).toMatchObject({ flujo: "ingreso", importe: 1500 });
  });

  it("crearDeudaNativa: deuda → valor negativo; origen='app'", async () => {
    await crearDeudaNativa(
      { concepto: "Préstamo", persona: "Leo", valor: 50, movimiento: "deuda", fecha: "2026-06-27" },
      "u",
    );
    expect(inserts[0]!.tabla).toBe("deuda");
    expect(inserts[0]!.row).toMatchObject({ origen: "app", valor: -50, persona: "Leo" });
  });

  it("crearDeudaNativa: pago → valor positivo", async () => {
    await crearDeudaNativa(
      { concepto: "Devolución", persona: "Leo", valor: 30, movimiento: "pago", fecha: "2026-06-27" },
      "u",
    );
    expect(inserts[0]!.row).toMatchObject({ valor: 30 });
  });

  it("actualizarEstadoMovimiento: setea estado y adopta (origen='app')", async () => {
    await actualizarEstadoMovimiento("m1", "Done");
    expect(updates[0]!.row).toMatchObject({ estado: "Done", origen: "app" });
  });

  it("borrarMovimientoById / borrarDeudaById: soft-delete + adopción", async () => {
    await borrarMovimientoById("m1");
    expect(updates[0]!.tabla).toBe("movimiento");
    expect(updates[0]!.row.origen).toBe("app");
    expect(updates[0]!.row.deleted_at).toBeTypeOf("string");

    updates.length = 0;
    await borrarDeudaById("d1");
    expect(updates[0]!.tabla).toBe("deuda");
    expect(updates[0]!.row.origen).toBe("app");
  });
});
