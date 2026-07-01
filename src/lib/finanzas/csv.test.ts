import { describe, it, expect } from "vitest";
import { movimientosToCsv } from "./csv";
import type { Movimiento } from "@/types/finanzas";

const mov = (over: Partial<Movimiento> = {}): Movimiento => ({
  id: "m1",
  notionPageId: null,
  nombre: "Mercadona",
  fecha: "2026-07-01",
  importe: -42.5,
  categoria: "Comida",
  tipo: "Gasto Variable",
  estado: "Pending",
  facturas: [],
  comprobantes: [],
  flujo: "gasto",
  ultimaEdicion: "2026-07-01T00:00:00Z",
  ...over,
});

describe("movimientosToCsv", () => {
  it("incluye la cabecera en español", () => {
    const csv = movimientosToCsv([]);
    expect(csv.split("\r\n")[0]).toBe("Fecha,Nombre,Categoría,Tipo,Estado,Persona,Flujo,Importe");
  });

  it("serializa una fila con estado legible e importe firmado", () => {
    const csv = movimientosToCsv([mov()]);
    const linea = csv.split("\r\n")[1];
    expect(linea).toBe("2026-07-01,Mercadona,Comida,Gasto Variable,Pendiente,,gasto,-42.5");
  });

  it("entrecomilla campos con coma o comillas", () => {
    const csv = movimientosToCsv([mov({ nombre: 'Bar "El Rincón", tapas' })]);
    expect(csv).toContain('"Bar ""El Rincón"", tapas"');
  });

  it("tolera campos nulos (importe/fecha)", () => {
    const csv = movimientosToCsv([mov({ importe: null, fecha: null, persona: "Leo", estado: "Done" })]);
    const linea = csv.split("\r\n")[1];
    expect(linea).toBe(",Mercadona,Comida,Gasto Variable,Pagado,Leo,gasto,");
  });
});
