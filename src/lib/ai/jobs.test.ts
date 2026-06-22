import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests de la cola de jobs (M6 · F-M6-1): validación de payload al encolar, claim
 * atómico vía RPC y cierre con `marcar`. Se mockea el cliente Supabase.
 */

type Captured = {
  inserts: { table: string; row: Record<string, unknown> }[];
  updates: { table: string; vals: Record<string, unknown>; id: unknown }[];
  rpc: string[];
};
const cap: Captured = { inserts: [], updates: [], rpc: [] };
let insertData: unknown = null;
let rpcData: unknown[] = [];

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        cap.inserts.push({ table, row });
        return { select: () => ({ single: async () => ({ data: insertData, error: null }) }) };
      },
      update: (vals: Record<string, unknown>) => ({
        eq: async (_col: string, id: unknown) => {
          cap.updates.push({ table, vals, id });
          return { error: null };
        },
      }),
    }),
    rpc: async (fn: string) => {
      cap.rpc.push(fn);
      return { data: rpcData, error: null };
    },
  }),
}));

import { encolar, tomarSiguiente, marcar } from "@/lib/ai/jobs";

const ROW = {
  id: "job-1",
  tipo: "consulta_rag",
  payload: { pregunta: "hola" },
  estado: "pendiente",
  resultado: null,
  intentos: 0,
  error: null,
  created_at: "2026-06-23T00:00:00Z",
  finished_at: null,
};

beforeEach(() => {
  cap.inserts = [];
  cap.updates = [];
  cap.rpc = [];
  insertData = ROW;
  rpcData = [];
});

describe("encolar", () => {
  it("valida el payload, recorta y encola como pendiente", async () => {
    const job = await encolar("user-1", "consulta_rag", { pregunta: "  ¿saldo de Leo?  " });
    expect(cap.inserts).toHaveLength(1);
    const row = cap.inserts[0]!.row;
    expect(row.user_id).toBe("user-1");
    expect(row.tipo).toBe("consulta_rag");
    expect(row.estado).toBe("pendiente");
    expect(row.intentos).toBe(0);
    expect((row.payload as { pregunta: string }).pregunta).toBe("¿saldo de Leo?"); // trim
    expect(job.id).toBe("job-1");
    expect(job.estado).toBe("pendiente");
    expect(job.createdAt).toBe("2026-06-23T00:00:00Z");
  });

  it("rechaza un payload inválido sin tocar la DB", async () => {
    await expect(encolar("user-1", "consulta_rag", { pregunta: "" })).rejects.toThrow();
    expect(cap.inserts).toHaveLength(0);
  });

  it("rechaza un tipo sin esquema de payload", async () => {
    // @ts-expect-error tipo no encolable a propósito
    await expect(encolar("user-1", "puntuar_evento", {})).rejects.toThrow(/sin esquema/);
    expect(cap.inserts).toHaveLength(0);
  });
});

describe("tomarSiguiente", () => {
  it("devuelve el job mapeado cuando la RPC trae uno", async () => {
    rpcData = [ROW];
    const job = await tomarSiguiente();
    expect(cap.rpc).toContain("tomar_ai_job");
    expect(job?.id).toBe("job-1");
  });

  it("devuelve null cuando no hay pendientes", async () => {
    rpcData = [];
    expect(await tomarSiguiente()).toBeNull();
  });
});

describe("marcar", () => {
  it("cierra el job con resultado y finished_at", async () => {
    await marcar("job-1", "ok", { resultado: { respuesta: "ok" } });
    expect(cap.updates).toHaveLength(1);
    const u = cap.updates[0]!;
    expect(u.id).toBe("job-1");
    expect(u.vals.estado).toBe("ok");
    expect(u.vals.resultado).toEqual({ respuesta: "ok" });
    expect(u.vals.finished_at).toBeTruthy();
  });

  it("cierra con error reintentable", async () => {
    await marcar("job-2", "error", { error: "salida no válida" });
    expect(cap.updates[0]!.vals.estado).toBe("error");
    expect(cap.updates[0]!.vals.error).toBe("salida no válida");
  });
});
