import { describe, it, expect } from "vitest";
import {
  CuotaAgotadaError,
  MARCADOR_CUOTA,
  detectarCuota,
  esCuotaAgotada,
  mensajeErrorJob,
} from "@/lib/ai/errors";

describe("detectarCuota", () => {
  it("detecta el aviso nuevo de límite y extrae el reset", () => {
    const r = detectarCuota("You've hit your session limit · resets 3:45pm");
    expect(r.agotada).toBe(true);
    expect(r.reset).toBe("3:45pm");
  });

  it("detecta el límite semanal / de Opus", () => {
    expect(detectarCuota("You've hit your weekly limit · resets Mon 12:00am").agotada).toBe(true);
    expect(detectarCuota("You've hit your Opus limit · resets 3:45pm").agotada).toBe(true);
  });

  it("detecta el patrón antiguo con epoch", () => {
    const r = detectarCuota("Claude AI usage limit reached|1750000000");
    expect(r.agotada).toBe(true);
    expect(r.reset).toBe("1750000000");
  });

  it("NO marca cuota en un error de auth ni en un rate-limit 429", () => {
    expect(detectarCuota("OAuth token has expired · Please run /login").agotada).toBe(false);
    expect(detectarCuota("API Error: 401 authentication_error").agotada).toBe(false);
    expect(detectarCuota("API Error: 429 rate_limit_error, retry later").agotada).toBe(false);
  });

  it("NO marca cuota en salida normal", () => {
    expect(detectarCuota('{"result":"hola"}').agotada).toBe(false);
  });
});

describe("esCuotaAgotada", () => {
  it("reconoce la clase de error y el mensaje serializado", () => {
    expect(esCuotaAgotada(new CuotaAgotadaError("3:45pm"))).toBe(true);
    expect(esCuotaAgotada(new Error(`${MARCADOR_CUOTA}|3:45pm`))).toBe(true);
    expect(esCuotaAgotada(`${MARCADOR_CUOTA}`)).toBe(true);
    expect(esCuotaAgotada(new Error("claude salió con código 1: boom"))).toBe(false);
  });
});

describe("mensajeErrorJob", () => {
  it("traduce la cuota agotada a un mensaje claro con el reset", () => {
    const msg = mensajeErrorJob(`${MARCADOR_CUOTA}|3:45pm`);
    expect(msg).toMatch(/cuota de Claude/i);
    expect(msg).toContain("3:45pm");
  });

  it("formatea un reset epoch como hora local", () => {
    const msg = mensajeErrorJob(`${MARCADOR_CUOTA}|1750000000`);
    expect(msg).toMatch(/cuota de Claude/i);
    expect(msg).not.toContain("1750000000"); // se formatea, no se muestra el epoch crudo
  });

  it("cuota sin reset: mensaje genérico de cuota", () => {
    expect(mensajeErrorJob(MARCADOR_CUOTA)).toMatch(/cuota de Claude/i);
  });

  it("otros errores se devuelven tal cual; null → fallback", () => {
    expect(mensajeErrorJob("Respuesta no válida.")).toBe("Respuesta no válida.");
    expect(mensajeErrorJob(null)).toBe("Error en la consulta.");
  });
});
