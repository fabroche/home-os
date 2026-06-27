import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests del motor de gastos a plazos: crear plan genera la cuota 1; el worker genera las
 * debidas con catch-up e idempotencia. Se mockea Supabase y `crearMovimientoNativo`
 * (capturamos las cuotas creadas y los update del plan).
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
  b.neq = () => b;
  b.eq = () => b;
  b.order = () => b;
  b.single = () => Promise.resolve({ data: { id: "plan-1", ...lastInsert }, error: null });
  b.then = (resolve: (v: { data: unknown; error: null }) => unknown) =>
    Promise.resolve({ data: activeRows, error: null }).then(resolve);
  return b;
}
vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({ from: () => makeBuilder() }),
}));

import { crearPlanCuotas, generarCuotasPendientes } from "@/lib/services/cuotas";

beforeEach(() => {
  crearMov.mockReset();
  crearMov.mockResolvedValue("m-x");
  activeRows = [];
  updates.length = 0;
  lastInsert = null;
});

describe("crearPlanCuotas", () => {
  it("crea el plan y genera SOLO la cuota 1 (fecha_inicio = hoy)", async () => {
    const id = await crearPlanCuotas(
      {
        concepto: "Portátil",
        montoTotal: 1000,
        numCuotas: 10,
        categoria: "Desarrollo",
        tipo: "Gasto Fijo",
        fechaInicio: "2026-06-27",
        diaFacturacion: 1,
        tarjetaId: "tc",
        persona: null,
      },
      "user-1",
      "2026-06-27", // hoy
    );
    expect(id).toBe("plan-1");
    expect(crearMov).toHaveBeenCalledTimes(1);
    expect(crearMov).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: "Portátil (1/10)", importe: 100, fecha: "2026-06-27", tarjetaId: "tc", estado: "Pending" }),
      "user-1",
    );
    // El plan queda con cuotas_generadas = 1.
    expect(updates.at(-1)!.patch).toMatchObject({ cuotas_generadas: 1, estado: "activo" });
  });
});

describe("generarCuotasPendientes", () => {
  it("catch-up: genera las cuotas atrasadas sin duplicar (idempotente)", async () => {
    activeRows = [
      {
        id: "plan-1",
        user_id: "u",
        tarjeta_id: "tc",
        concepto: "Portátil",
        monto_total: 1000,
        num_cuotas: 10,
        categoria: "Desarrollo",
        tipo: "Gasto Fijo",
        fecha_inicio: "2026-06-20",
        dia_facturacion: 1,
        persona: null,
        cuotas_generadas: 1, // ya existe la cuota 1
        estado: "activo",
      },
    ];
    // hoy = 2026-08-15 → cuotas debidas: 1 (20-jun) + jul-01 + ago-01 = 3. Faltan la 2 y la 3.
    const creadas = await generarCuotasPendientes("2026-08-15");
    expect(creadas).toBe(2);
    expect(crearMov).toHaveBeenCalledTimes(2);
    expect(crearMov.mock.calls[0]![0]).toMatchObject({ nombre: "Portátil (2/10)", fecha: "2026-07-01" });
    expect(crearMov.mock.calls[1]![0]).toMatchObject({ nombre: "Portátil (3/10)", fecha: "2026-08-01" });
    expect(updates.at(-1)!.patch).toMatchObject({ cuotas_generadas: 3 });
  });

  it("marca el plan completado al generar la última cuota", async () => {
    activeRows = [
      {
        id: "plan-2",
        user_id: "u",
        tarjeta_id: null,
        concepto: "Tele",
        monto_total: 200,
        num_cuotas: 2,
        categoria: "Confort",
        tipo: "Gasto Fijo",
        fecha_inicio: "2026-06-01",
        dia_facturacion: 1,
        persona: null,
        cuotas_generadas: 1,
        estado: "activo",
      },
    ];
    await generarCuotasPendientes("2026-07-30"); // jul-01 vencida → cuota 2 (última)
    expect(crearMov).toHaveBeenCalledTimes(1);
    expect(updates.at(-1)!.patch).toMatchObject({ cuotas_generadas: 2, estado: "completado" });
  });
});
