import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AiJob } from "@/types/ai";
import type { FragmentoContexto } from "@/types/contexto";

/**
 * Tests del runner (M6 · F-M6-2/3): prompt puro, extracción de JSON, ejecución con
 * validación Zod y drain de la cola. `invocar` y `recuperar` se inyectan (no se
 * llama a Claude ni a la DB); la cola se mockea para `drenarCola`.
 */

const tomarSiguienteMock = vi.fn();
const marcarMock = vi.fn();
vi.mock("@/lib/ai/jobs", () => ({
  tomarSiguiente: (...a: unknown[]) => tomarSiguienteMock(...a),
  marcar: (...a: unknown[]) => marcarMock(...a),
}));

import { construirPrompt, extraerJson, ejecutarJob, drenarCola } from "@/lib/ai/runner";

const job = (over: Partial<AiJob> = {}): AiJob => ({
  id: "j1",
  userId: "u1",
  tipo: "consulta_rag",
  payload: { pregunta: "¿saldo de Leo?" },
  estado: "ejecutando",
  resultado: null,
  intentos: 1,
  error: null,
  createdAt: "2026-06-23T00:00:00Z",
  finishedAt: null,
  ...over,
});

const fragmento: FragmentoContexto = {
  id: "c1",
  tipo: "regla_financiera",
  titulo: "Leo",
  contenido: "Leo te debe 50€",
  tags: [],
  score: 1,
};
const recuperar = async () => [fragmento];
const listar = async () => [fragmento];

beforeEach(() => {
  tomarSiguienteMock.mockReset();
  marcarMock.mockReset();
});

describe("construirPrompt", () => {
  it("incluye la pregunta, el contexto y pide JSON", () => {
    const p = construirPrompt(job(), [fragmento]);
    expect(p).toContain("¿saldo de Leo?");
    expect(p).toContain("Leo");
    expect(p).toMatch(/JSON/);
  });

  it("indica ausencia de contexto cuando no hay fragmentos", () => {
    expect(construirPrompt(job(), [])).toContain("(sin contexto relevante)");
  });
});

describe("extraerJson", () => {
  it("parsea JSON crudo, con fences y rodeado de texto", () => {
    expect(extraerJson('{"a":1}')).toEqual({ a: 1 });
    expect(extraerJson("```json\n{\"a\":2}\n```")).toEqual({ a: 2 });
    expect(extraerJson('bla {"a":3} fin')).toEqual({ a: 3 });
  });
});

describe("ejecutarJob", () => {
  it("consulta_rag: valida y devuelve la salida conforme", async () => {
    const invocar = async () => JSON.stringify({ respuesta: "Leo te debe 50€", fuentes: [{ id: "c1", titulo: "Leo" }] });
    const res = (await ejecutarJob(job(), { invocar, recuperar, listar })) as { respuesta: string };
    expect(res.respuesta).toBe("Leo te debe 50€");
  });

  it("lanza (reintentable) si la salida no conforma el esquema", async () => {
    const invocar = async () => JSON.stringify({ fuentes: [] }); // falta respuesta
    await expect(ejecutarJob(job(), { invocar, recuperar, listar })).rejects.toThrow();
  });

  it("proponer_contexto: acepta JSON con fences y borradores", async () => {
    const j = job({ tipo: "proponer_contexto", payload: { peticion: "Naturgy es mi gas" } });
    const invocar = async () =>
      "```json\n" +
      JSON.stringify({ borradores: [{ tipo: "proveedor", titulo: "Naturgy", contenido: "Compañía de gas", tags: ["gas"] }] }) +
      "\n```";
    const res = (await ejecutarJob(j, { invocar, recuperar, listar })) as { borradores: unknown[] };
    expect(res.borradores).toHaveLength(1);
  });
});

describe("drenarCola", () => {
  it("procesa un job y lo cierra como ok", async () => {
    tomarSiguienteMock.mockResolvedValueOnce(job()).mockResolvedValueOnce(null);
    const invocar = async () => JSON.stringify({ respuesta: "ok", fuentes: [] });
    const n = await drenarCola({ invocar, recuperar, listar });
    expect(n).toBe(1);
    expect(marcarMock).toHaveBeenCalledWith(
      "j1",
      "ok",
      expect.objectContaining({ resultado: expect.objectContaining({ respuesta: "ok" }) }),
    );
  });

  it("marca error (reintentable) si la salida es inválida", async () => {
    tomarSiguienteMock.mockResolvedValueOnce(job()).mockResolvedValueOnce(null);
    const invocar = async () => "{ esto no es json";
    await drenarCola({ invocar, recuperar, listar });
    expect(marcarMock).toHaveBeenCalledWith("j1", "error", expect.objectContaining({ error: expect.any(String) }));
  });
});
