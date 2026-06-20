import { describe, it, expect } from "vitest";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { toMovimiento } from "./presupuesto";

// Construye una página de Notion mínima (solo lo que leen los mappers).
function page(props: Record<string, unknown>): PageObjectResponse {
  return {
    id: "page-1",
    url: "https://notion.so/page-1",
    last_edited_time: "2026-06-20T10:00:00.000Z",
    properties: props,
  } as unknown as PageObjectResponse;
}

describe("toMovimiento", () => {
  it("mapea un gasto y deriva flujo=gasto", () => {
    const m = toMovimiento(
      page({
        Name: { type: "title", title: [{ plain_text: "Café" }] },
        Date: { type: "date", date: { start: "2026-06-01" } },
        amount: { type: "number", number: 3.5 },
        category: { type: "select", select: { name: "Restaurantes" } },
        type: { type: "select", select: { name: "Gasto Hormiga" } },
        status: { type: "status", status: { name: "Done" } },
        invoices: { type: "files", files: [] },
      }),
    );
    expect(m.nombre).toBe("Café");
    expect(m.importe).toBe(3.5);
    expect(m.categoria).toBe("Restaurantes");
    expect(m.flujo).toBe("gasto");
    expect(m.facturas).toEqual([]);
  });

  it("deriva flujo=ingreso para 'Ingreso Fijo' y lee facturas adjuntas", () => {
    const m = toMovimiento(
      page({
        Name: { type: "title", title: [{ plain_text: "Salario" }] },
        type: { type: "select", select: { name: "Ingreso Fijo" } },
        invoices: {
          type: "files",
          files: [{ type: "file", file: { url: "https://x/factura.pdf" } }],
        },
      }),
    );
    expect(m.flujo).toBe("ingreso");
    expect(m.facturas).toEqual(["https://x/factura.pdf"]);
  });

  it("deriva flujo=deuda y tolera campos vacíos", () => {
    const m = toMovimiento(
      page({
        Name: { type: "title", title: [] },
        type: { type: "select", select: { name: "Deuda" } },
      }),
    );
    expect(m.flujo).toBe("deuda");
    expect(m.nombre).toBe("");
    expect(m.importe).toBeNull();
  });
});
