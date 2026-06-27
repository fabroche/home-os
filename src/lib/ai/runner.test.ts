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
const reintentarMock = vi.fn();
vi.mock("@/lib/ai/jobs", () => ({
  tomarSiguiente: (...a: unknown[]) => tomarSiguienteMock(...a),
  marcar: (...a: unknown[]) => marcarMock(...a),
  reintentar: (...a: unknown[]) => reintentarMock(...a),
}));

import { construirPrompt, extraerJson, ejecutarJob, drenarCola, backoffMs } from "@/lib/ai/runner";
import { CuotaAgotadaError, MARCADOR_CUOTA } from "@/lib/ai/errors";

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
const finanzas = async () => "Balance global: 100,00 €";
const pendientes = async () => "id:pg1 | Luz | 30.00 € | 2026-06-01";
const borrables = async () =>
  "MOVIMIENTOS:\nid:pg1 | Luz | 30.00 € | 2026-06-01 | Pending\n\nDEUDAS:\nid:bd1 | Préstamo | Leo | -50.00 €";

beforeEach(() => {
  tomarSiguienteMock.mockReset();
  marcarMock.mockReset();
  reintentarMock.mockReset();
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

  it("incluye el snapshot financiero en consulta_rag", () => {
    const p = construirPrompt(job(), [fragmento], "Balance global: 100,00 €");
    expect(p).toContain("DATOS FINANCIEROS");
    expect(p).toContain("Balance global: 100,00 €");
  });

  it("registrar_gasto: incluye la petición, las categorías válidas y la fecha de hoy", () => {
    const j = job({ tipo: "registrar_gasto", payload: { peticion: "gasté 40 en comida" } });
    const p = construirPrompt(j, [], "2026-06-23");
    expect(p).toContain("gasté 40 en comida");
    expect(p).toContain("Comida"); // una de las CATEGORIAS
    expect(p).toContain("2026-06-23"); // fecha de hoy
    expect(p).toMatch(/propuesta/);
  });

  it("asistente (router): enumera las acciones, incluye el mensaje y los datos, y permite aclarar", () => {
    const j = job({ tipo: "asistente", payload: { mensaje: "ya pagué la luz" } });
    const p = construirPrompt(j, [fragmento], "FECHA DE HOY: 2026-06-23\n\n=== DATOS FINANCIEROS ===\nBalance global: 100,00 €");
    expect(p).toContain("ya pagué la luz"); // el MENSAJE del usuario
    expect(p).toContain("Balance global: 100,00 €"); // los datos combinados
    expect(p).toContain('"aclarar"'); // puede pedir desambiguación
    expect(p).toMatch(/"responder"/);
    expect(p).toMatch(/"gasto"\|"ingreso"/);
    expect(p).toMatch(/"borrar"/); // ofrece la acción de borrado
    expect(p).toContain("Leo"); // contexto recuperado
  });

  it("asistente: incluye la conversación reciente y la regla de enmienda de propuestas", () => {
    const j = job({
      tipo: "asistente",
      payload: {
        mensaje: "no, fue hace 2 días",
        historial: [
          { rol: "user", texto: "apúntame un café de 2,5€" },
          { rol: "assistant", texto: 'Propuse registrar un gasto: "Café", 2.5€, fecha 2026-06-27.' },
        ],
      },
    });
    const p = construirPrompt(j, [], "FECHA DE HOY: 2026-06-27");
    expect(p).toContain("CONVERSACIÓN RECIENTE");
    expect(p).toContain("Propuse registrar un gasto"); // el turno previo serializado
    expect(p).toMatch(/corrige o ajusta una propuesta anterior/i); // la regla de enmienda
  });

  it("asistente sin historial: indica que no hay conversación previa", () => {
    const j = job({ tipo: "asistente", payload: { mensaje: "hola" } });
    expect(construirPrompt(j, [])).toContain("(sin conversación previa)");
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
    const res = (await ejecutarJob(job(), { invocar, recuperar, listar, finanzas, pendientes, borrables })) as { respuesta: string };
    expect(res.respuesta).toBe("Leo te debe 50€");
  });

  it("lanza (reintentable) si la salida no conforma el esquema", async () => {
    const invocar = async () => JSON.stringify({ fuentes: [] }); // falta respuesta
    await expect(ejecutarJob(job(), { invocar, recuperar, listar, finanzas, pendientes, borrables })).rejects.toThrow();
  });

  it("registrar_gasto: valida y devuelve la propuesta de gasto", async () => {
    const j = job({ tipo: "registrar_gasto", payload: { peticion: "gasté 40 en comida hoy" } });
    const invocar = async () =>
      JSON.stringify({
        propuesta: { nombre: "Comida", importe: 40, categoria: "Comida", tipo: "Gasto Variable", fecha: "2026-06-23", estado: "Pending" },
        nota: "",
      });
    const res = (await ejecutarJob(j, { invocar, recuperar, listar, finanzas, pendientes, borrables })) as {
      propuesta: { importe: number } | null;
    };
    expect(res.propuesta?.importe).toBe(40);
  });

  it("registrar_gasto: acepta propuesta null con nota cuando falta info", async () => {
    const j = job({ tipo: "registrar_gasto", payload: { peticion: "registra un gasto en comida" } });
    const invocar = async () => JSON.stringify({ propuesta: null, nota: "¿De cuánto fue el gasto?" });
    const res = (await ejecutarJob(j, { invocar, recuperar, listar, finanzas, pendientes, borrables })) as {
      propuesta: null;
      nota: string;
    };
    expect(res.propuesta).toBeNull();
    expect(res.nota).toMatch(/cuánto/i);
  });

  it("registrar_ingreso: valida y devuelve la propuesta de ingreso", async () => {
    const j = job({ tipo: "registrar_ingreso", payload: { peticion: "mi salario de 1500€" } });
    const invocar = async () =>
      JSON.stringify({
        propuesta: { nombre: "Salario", importe: 1500, categoria: "Salario", tipo: "Ingreso Fijo", fecha: "2026-06-23", estado: "Pending" },
        nota: "",
      });
    const res = (await ejecutarJob(j, { invocar, recuperar, listar, finanzas, pendientes, borrables })) as {
      propuesta: { tipo: string } | null;
    };
    expect(res.propuesta?.tipo).toBe("Ingreso Fijo");
  });

  it("registrar_deuda: valida y devuelve la propuesta de deuda", async () => {
    const j = job({ tipo: "registrar_deuda", payload: { peticion: "le presté 50 a Leo" } });
    const invocar = async () =>
      JSON.stringify({
        propuesta: { concepto: "Préstamo", persona: "Leo", valor: 50, movimiento: "deuda", fecha: "2026-06-23" },
        nota: "",
      });
    const res = (await ejecutarJob(j, { invocar, recuperar, listar, finanzas, pendientes, borrables })) as {
      propuesta: { persona: string; valor: number } | null;
    };
    expect(res.propuesta).toMatchObject({ persona: "Leo", valor: 50 });
  });

  it("marcar_pagado: incluye la lista de pendientes en el prompt y devuelve el id elegido", async () => {
    const j = job({ tipo: "marcar_pagado", payload: { peticion: "marca como pagada la luz" } });
    let promptVisto = "";
    const invocar = async (p: string) => {
      promptVisto = p;
      return JSON.stringify({ movimiento: { id: "pg1", nombre: "Luz", importe: 30 }, nota: "" });
    };
    const res = (await ejecutarJob(j, { invocar, recuperar, listar, finanzas, pendientes, borrables })) as {
      movimiento: { id: string } | null;
    };
    expect(promptVisto).toContain("id:pg1 | Luz"); // se le pasó la lista de pendientes
    expect(res.movimiento?.id).toBe("pg1");
  });

  it("asistente: clasifica como gasto y devuelve la propuesta (con datos+pendientes en el prompt)", async () => {
    const j = job({ tipo: "asistente", payload: { mensaje: "gasté 40 en comida" } });
    let promptVisto = "";
    const invocar = async (p: string) => {
      promptVisto = p;
      return JSON.stringify({
        accion: "gasto",
        propuesta: { nombre: "Comida", importe: 40, categoria: "Comida", tipo: "Gasto Variable", fecha: "2026-06-23", estado: "Pending" },
        nota: "",
      });
    };
    const res = (await ejecutarJob(j, { invocar, recuperar, listar, finanzas, pendientes, borrables })) as {
      accion: string;
      propuesta: { importe: number } | null;
    };
    expect(promptVisto).toContain("Balance global"); // snapshot financiero
    expect(promptVisto).toContain("id:pg1 | Luz"); // lista de pendientes
    expect(res.accion).toBe("gasto");
    expect(res.propuesta?.importe).toBe(40);
  });

  it("asistente: clasifica como borrar y devuelve el objetivo (con borrables en el prompt)", async () => {
    const j = job({ tipo: "asistente", payload: { mensaje: "borra el préstamo de Leo" } });
    let promptVisto = "";
    const invocar = async (p: string) => {
      promptVisto = p;
      return JSON.stringify({ accion: "borrar", objetivo: { tipo: "deuda", id: "bd1", nombre: "Préstamo" }, nota: "" });
    };
    const res = (await ejecutarJob(j, { invocar, recuperar, listar, finanzas, pendientes, borrables })) as {
      accion: string;
      objetivo: { id: string; tipo: string } | null;
    };
    expect(promptVisto).toContain("MOVIMIENTOS Y DEUDAS"); // se le pasó la lista de borrables
    expect(promptVisto).toContain("id:bd1");
    expect(res.accion).toBe("borrar");
    expect(res.objetivo).toMatchObject({ tipo: "deuda", id: "bd1" });
  });

  it("asistente: borrar acepta objetivo null con nota cuando no hay match", async () => {
    const j = job({ tipo: "asistente", payload: { mensaje: "borra eso" } });
    const invocar = async () => JSON.stringify({ accion: "borrar", objetivo: null, nota: "¿Cuál exactamente?" });
    const res = (await ejecutarJob(j, { invocar, recuperar, listar, finanzas, pendientes, borrables })) as {
      accion: string;
      objetivo: null;
    };
    expect(res.accion).toBe("borrar");
    expect(res.objetivo).toBeNull();
  });

  it("asistente: puede pedir aclaración con opciones tipadas", async () => {
    const j = job({ tipo: "asistente", payload: { mensaje: "ya pagué la luz" } });
    const invocar = async () =>
      JSON.stringify({
        accion: "aclarar",
        pregunta: "¿Gasto nuevo o marcar la luz como pagada?",
        opciones: [
          { etiqueta: "Registrar gasto nuevo", accion: "gasto" },
          { etiqueta: "Marcar la luz como pagada", accion: "pagado" },
        ],
      });
    const res = (await ejecutarJob(j, { invocar, recuperar, listar, finanzas, pendientes, borrables })) as {
      accion: string;
      opciones: { accion: string }[];
    };
    expect(res.accion).toBe("aclarar");
    expect(res.opciones).toHaveLength(2);
    expect(res.opciones[0]!.accion).toBe("gasto");
  });

  it("asistente: rechaza una opción de aclarar con acción inválida (Zod)", async () => {
    const j = job({ tipo: "asistente", payload: { mensaje: "x" } });
    const invocar = async () =>
      JSON.stringify({
        accion: "aclarar",
        pregunta: "¿?",
        opciones: [{ etiqueta: "Algo raro", accion: "borrar_todo" }],
      });
    await expect(ejecutarJob(j, { invocar, recuperar, listar, finanzas, pendientes, borrables })).rejects.toThrow();
  });

  it("proponer_contexto: acepta JSON con fences y borradores", async () => {
    const j = job({ tipo: "proponer_contexto", payload: { peticion: "Naturgy es mi gas" } });
    const invocar = async () =>
      "```json\n" +
      JSON.stringify({ borradores: [{ tipo: "proveedor", titulo: "Naturgy", contenido: "Compañía de gas", tags: ["gas"] }] }) +
      "\n```";
    const res = (await ejecutarJob(j, { invocar, recuperar, listar, finanzas, pendientes, borrables })) as { borradores: unknown[] };
    expect(res.borradores).toHaveLength(1);
  });
});

describe("backoffMs", () => {
  it("crece exponencialmente con tope", () => {
    expect(backoffMs(1, 2000)).toBe(2000);
    expect(backoffMs(2, 2000)).toBe(4000);
    expect(backoffMs(3, 2000)).toBe(8000);
    expect(backoffMs(99, 2000, 60000)).toBe(60000); // tope
  });
});

describe("drenarCola", () => {
  it("procesa un job y lo cierra como ok", async () => {
    tomarSiguienteMock.mockResolvedValueOnce(job()).mockResolvedValueOnce(null);
    const invocar = async () => JSON.stringify({ respuesta: "ok", fuentes: [] });
    const r = await drenarCola({ invocar, recuperar, listar, finanzas, pendientes, borrables });
    expect(r).toMatchObject({ procesados: 1, ok: 1, reintentos: 0, errores: 0 });
    expect(marcarMock).toHaveBeenCalledWith(
      "j1",
      "ok",
      expect.objectContaining({ resultado: expect.objectContaining({ respuesta: "ok" }) }),
    );
  });

  it("re-encola (backoff) si falla y quedan intentos", async () => {
    tomarSiguienteMock.mockResolvedValueOnce(job({ intentos: 1 })).mockResolvedValueOnce(null);
    const invocar = async () => "{ esto no es json";
    const r = await drenarCola({ invocar, recuperar, listar, finanzas, pendientes, borrables }, 3);
    expect(r.reintentos).toBe(1);
    expect(reintentarMock).toHaveBeenCalledWith("j1", expect.any(Number), expect.any(String));
    expect(marcarMock).not.toHaveBeenCalled();
  });

  it("cuota agotada: NO reintenta aunque queden intentos; error terminal con marcador", async () => {
    tomarSiguienteMock.mockResolvedValueOnce(job({ intentos: 1 })).mockResolvedValueOnce(null);
    const invocar = async () => {
      throw new CuotaAgotadaError("3:45pm");
    };
    const r = await drenarCola({ invocar, recuperar, listar, finanzas, pendientes, borrables }, 3);
    expect(r.errores).toBe(1);
    expect(r.reintentos).toBe(0);
    expect(reintentarMock).not.toHaveBeenCalled();
    expect(marcarMock).toHaveBeenCalledWith(
      "j1",
      "error",
      expect.objectContaining({ error: expect.stringContaining(MARCADOR_CUOTA) }),
    );
  });

  it("marca error terminal al agotar los intentos", async () => {
    tomarSiguienteMock.mockResolvedValueOnce(job({ intentos: 3 })).mockResolvedValueOnce(null);
    const invocar = async () => "{ esto no es json";
    const r = await drenarCola({ invocar, recuperar, listar, finanzas, pendientes, borrables }, 3);
    expect(r.errores).toBe(1);
    expect(marcarMock).toHaveBeenCalledWith("j1", "error", expect.objectContaining({ error: expect.any(String) }));
    expect(reintentarMock).not.toHaveBeenCalled();
  });
});
