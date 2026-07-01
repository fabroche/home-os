import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests del motor de gastos recurrentes: crear genera el mes en curso si toca; el worker
 * genera los meses debidos con catch-up e idempotencia (`ultima_generada`). Se mockea Supabase
 * y `crearMovimientoNativo` (capturamos los movimientos creados y los update del recurrente).
 */
const crearMov = vi.fn();
vi.mock("@/lib/services/finanzas", () => ({
  crearMovimientoNativo: (...a: unknown[]) => crearMov(...a),
}));

let activeRows: Record<string, unknown>[] = [];
const updates: { patch: Record<string, unknown> }[] = [];
let lastInsert: Record<string, unknown> | null = null;

function makeBuilder() {
  const b: Record<string, unknown> = {};
  b.insert = (row: Record<string, unknown>) => {
    lastInsert = row;
    return b;
  };
  b.update = (patch: Record<string, unknown>) => {
    updates.push({ patch });
    return b;
  };
  b.select = () => b;
  b.eq = () => b;
  b.order = () => b;
  b.single = () => Promise.resolve({ data: { id: "rec-1", ...lastInsert }, error: null });
  b.then = (resolve: (v: { data: unknown; error: null }) => unknown) =>
    Promise.resolve({ data: activeRows, error: null }).then(resolve);
  return b;
}
vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({ from: () => makeBuilder() }),
}));

import { crearGastoRecurrente, generarRecurrentesPendientes } from "@/lib/services/gastos-recurrentes";

beforeEach(() => {
  crearMov.mockReset();
  crearMov.mockResolvedValue("m-x");
  activeRows = [];
  updates.length = 0;
  lastInsert = null;
});

describe("crearGastoRecurrente", () => {
  it("crea el recurrente y genera el movimiento del mes en curso si ya toca", async () => {
    const id = await crearGastoRecurrente(
      {
        concepto: "Alquiler",
        monto: 800,
        categoria: "Casa",
        tipo: "Gasto Fijo",
        diaMes: 1,
        fechaInicio: "2026-07-01",
        cuentaId: "c1",
        tarjetaId: null,
        persona: null,
      },
      "user-1",
      "2026-07-10", // hoy
    );
    expect(id).toBe("rec-1");
    expect(crearMov).toHaveBeenCalledTimes(1);
    expect(crearMov).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: "Alquiler", importe: 800, fecha: "2026-07-01", cuentaId: "c1", estado: "Pending" }),
      "user-1",
    );
    expect(updates.at(-1)!.patch).toMatchObject({ ultima_generada: "2026-07" });
  });
});

describe("generarRecurrentesPendientes", () => {
  it("catch-up: genera los meses atrasados sin duplicar", async () => {
    activeRows = [
      {
        id: "rec-1",
        user_id: "u",
        concepto: "Netflix",
        monto: 13,
        categoria: "Osio",
        tipo: "Gasto Fijo",
        dia_mes: 5,
        fecha_inicio: "2026-01-05",
        cuenta_id: null,
        tarjeta_id: "tc",
        persona: null,
        ultima_generada: "2026-05", // hasta mayo generado
        activo: true,
      },
    ];
    const creados = await generarRecurrentesPendientes("2026-07-10"); // debidos: jun-05, jul-05
    expect(creados).toBe(2);
    expect(crearMov).toHaveBeenCalledTimes(2);
    expect(crearMov.mock.calls[0]![0]).toMatchObject({ nombre: "Netflix", fecha: "2026-06-05", tarjetaId: "tc" });
    expect(crearMov.mock.calls[1]![0]).toMatchObject({ nombre: "Netflix", fecha: "2026-07-05" });
    expect(updates.at(-1)!.patch).toMatchObject({ ultima_generada: "2026-07" });
  });

  it("no genera nada si ya está al día (idempotente)", async () => {
    activeRows = [
      {
        id: "rec-2",
        user_id: "u",
        concepto: "Gimnasio",
        monto: 35,
        categoria: "Confort",
        tipo: "Gasto Fijo",
        dia_mes: 3,
        fecha_inicio: "2026-01-03",
        cuenta_id: null,
        tarjeta_id: null,
        persona: null,
        ultima_generada: "2026-07",
        activo: true,
      },
    ];
    const creados = await generarRecurrentesPendientes("2026-07-10");
    expect(creados).toBe(0);
    expect(crearMov).not.toHaveBeenCalled();
    expect(updates.length).toBe(0);
  });
});
