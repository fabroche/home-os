import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests del mark-and-sweep del sync Notion→Supabase: las páginas activas se
 * upsertan y las filas que ya no vienen de Notion se marcan con `deleted_at`.
 * Se mockean la capa Notion y el cliente Supabase (sólo verificamos la lógica).
 */

const queryDatabase = vi.fn();
vi.mock("@/lib/notion/databases", () => ({
  queryDatabase: (...a: unknown[]) => queryDatabase(...a),
}));
vi.mock("@/lib/notion/mutations", () => ({ retrievePage: vi.fn() }));
vi.mock("@/lib/notion/schema", () => ({
  PRESUPUESTO: { id: "db-presupuesto" },
  DEUDAS: { id: "db-deudas" },
}));
// Los mappers reciben el objeto crudo y devuelven el dominio mínimo que el sync usa.
vi.mock("@/lib/notion/mappers/presupuesto", () => ({ toMovimiento: (x: unknown) => x }));
vi.mock("@/lib/notion/mappers/deuda", () => ({ toDeuda: (x: unknown) => x }));

// Mock del cliente Supabase: registra upserts y devuelve filas "barridas" / "reclamadas" por tabla.
const upserts: { tabla: string; rows: unknown[] }[] = [];
let sweepResult: Record<string, unknown[]> = {};
let reclamadosResult: Record<string, { notion_page_id: string }[]> = {};
const sweptTables: string[] = [];

// Builder encadenable y "thenable": resuelve a las filas barridas (si pasó por update) o a las
// reclamadas (select+eq+not, sin update). Cubre el sweep y `notionIdsReclamados` (Fase B).
function makeBuilder(tabla: string) {
  let modo: "query" | "sweep" = "query";
  const builder: Record<string, unknown> = {};
  builder.upsert = (rows: unknown[]) => {
    if (tabla !== "sync_state") upserts.push({ tabla, rows });
    return Promise.resolve({ error: null });
  };
  builder.update = () => {
    sweptTables.push(tabla);
    modo = "sweep";
    return builder;
  };
  builder.lt = () => builder;
  builder.is = () => builder;
  builder.eq = () => builder;
  builder.not = () => builder;
  builder.select = () => builder;
  builder.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) => {
    const data = modo === "sweep" ? (sweepResult[tabla] ?? []) : (reclamadosResult[tabla] ?? []);
    return Promise.resolve({ data, error: null }).then(resolve);
  };
  return builder;
}

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({ from: (tabla: string) => makeBuilder(tabla) }),
}));

import { syncFinanzas } from "@/lib/notion/sync/finanzas";

beforeEach(() => {
  queryDatabase.mockReset();
  upserts.length = 0;
  sweptTables.length = 0;
  sweepResult = {};
  reclamadosResult = {};
});

describe("syncFinanzas · mark-and-sweep", () => {
  it("upserta los activos y reporta los borrados barridos", async () => {
    queryDatabase
      .mockResolvedValueOnce([{ notionPageId: "m1", ultimaEdicion: "2026-06-01" }]) // presupuesto
      .mockResolvedValueOnce([{ notionPageId: "d1", ultimaEdicion: "2026-06-02" }]); // deudas
    sweepResult = { movimiento: [{ notion_page_id: "viejo" }, { notion_page_id: "viejo2" }], deuda: [{ notion_page_id: "dx" }] };

    const res = await syncFinanzas();

    expect(res.movimientos).toBe(1);
    expect(res.deudas).toBe(1);
    expect(res.movimientosBorrados).toBe(2);
    expect(res.deudasBorrados).toBe(1);
    expect(sweptTables).toContain("movimiento");
    expect(sweptTables).toContain("deuda");
  });

  it("los rows upsertados llevan deleted_at=null (revive si reaparece)", async () => {
    queryDatabase
      .mockResolvedValueOnce([{ notionPageId: "m1", ultimaEdicion: "2026-06-01" }])
      .mockResolvedValueOnce([]);

    await syncFinanzas();

    const movUpsert = upserts.find((u) => u.tabla === "movimiento");
    expect((movUpsert?.rows[0] as { deleted_at: unknown }).deleted_at).toBeNull();
  });

  it("Fase B: NO reimporta páginas que la app adoptó (origen='app')", async () => {
    queryDatabase
      .mockResolvedValueOnce([
        { notionPageId: "m1", ultimaEdicion: "2026-06-01" },
        { notionPageId: "m2", ultimaEdicion: "2026-06-02" },
      ])
      .mockResolvedValueOnce([]);
    // m1 ya fue adoptada por la app → el importador debe saltarla.
    reclamadosResult = { movimiento: [{ notion_page_id: "m1" }] };

    const res = await syncFinanzas();

    const movUpsert = upserts.find((u) => u.tabla === "movimiento");
    const ids = (movUpsert?.rows as { notion_page_id: string }[]).map((r) => r.notion_page_id);
    expect(ids).toEqual(["m2"]); // m1 excluida
    expect(res.movimientos).toBe(1);
  });

  it("NO barre si el query no trajo registros (guarda anti-borrado masivo)", async () => {
    queryDatabase.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const res = await syncFinanzas();

    expect(sweptTables).not.toContain("movimiento");
    expect(sweptTables).not.toContain("deuda");
    expect(res.movimientosBorrados).toBe(0);
    expect(res.deudasBorrados).toBe(0);
  });
});
