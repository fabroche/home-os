import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests del servicio de cuentas/tarjetas (nativo Supabase). Se mockea el cliente:
 * capturamos las filas de insert/update.
 */
const inserts: { tabla: string; row: Record<string, unknown> }[] = [];
const updates: { tabla: string; row: Record<string, unknown> }[] = [];

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
  b.single = () => Promise.resolve({ data: { id: "new-id" }, error: null });
  b.then = (resolve: (v: { data: unknown; error: null }) => unknown) =>
    Promise.resolve({ data: null, error: null }).then(resolve);
  return b;
}
vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({ from: (t: string) => makeBuilder(t) }),
}));

import { crearCuenta, crearTarjeta, archivarCuenta } from "@/lib/services/cuentas";

beforeEach(() => {
  inserts.length = 0;
  updates.length = 0;
});

describe("servicio cuentas/tarjetas", () => {
  it("crearCuenta inserta con user_id y devuelve id", async () => {
    const id = await crearCuenta({ nombre: "Santander", tipo: "corriente", saldoInicial: 500 }, "user-1");
    expect(id).toBe("new-id");
    expect(inserts[0]!.tabla).toBe("cuenta");
    expect(inserts[0]!.row).toMatchObject({ user_id: "user-1", nombre: "Santander", tipo: "corriente", saldo_inicial: 500, activo: true });
  });

  it("crearTarjeta de crédito guarda límite y días de corte/pago", async () => {
    await crearTarjeta(
      { nombre: "Visa", tipo: "credito", cuentaId: "c1", limite: 2000, diaCorte: 5, diaPago: 25 },
      "u",
    );
    expect(inserts[0]!.tabla).toBe("tarjeta");
    expect(inserts[0]!.row).toMatchObject({ tipo: "credito", limite: 2000, dia_corte: 5, dia_pago: 25, cuenta_id: "c1" });
  });

  it("crearTarjeta de débito ignora las propiedades de crédito (null)", async () => {
    await crearTarjeta(
      { nombre: "Maestro", tipo: "debito", cuentaId: "c1", limite: 999, diaCorte: 5, diaPago: 25 },
      "u",
    );
    expect(inserts[0]!.row).toMatchObject({ tipo: "debito", limite: null, dia_corte: null, dia_pago: null });
  });

  it("archivarCuenta marca activo=false", async () => {
    await archivarCuenta("c1");
    expect(updates[0]!.tabla).toBe("cuenta");
    expect(updates[0]!.row).toMatchObject({ activo: false });
  });
});
