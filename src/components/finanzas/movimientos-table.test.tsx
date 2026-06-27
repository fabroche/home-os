// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import type { Movimiento } from "@/types/finanzas";

// Las celdas hijas usan Server Actions + router; se mockean para el render.
vi.mock("@/lib/actions/finanzas", () => ({
  cambiarEstadoMovimiento: vi.fn(),
  subirArchivoMovimiento: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { MovimientosTable } from "@/components/finanzas/movimientos-table";

const mov = (over: Partial<Movimiento>): Movimiento => ({
  id: crypto.randomUUID(),
  notionPageId: crypto.randomUUID(),
  nombre: "Mov",
  fecha: "2026-06-01",
  importe: -50,
  categoria: "Casa",
  tipo: "Gasto Fijo",
  estado: "Pending",
  facturas: [],
  comprobantes: [],
  flujo: "gasto",
  ultimaEdicion: "2026-06-01T00:00:00Z",
  ...over,
});

const filas = (c: HTMLElement) => c.querySelectorAll("tbody tr");

describe("MovimientosTable", () => {
  it("renderiza filas con nombre, estado e importe", () => {
    render(<MovimientosTable movimientos={[mov({ nombre: "Alquiler", importe: -700 })]} />);
    expect(screen.getByText("Alquiler")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pendiente/i })).toBeInTheDocument();
    expect(screen.getByText(/-700,00/)).toBeInTheDocument();
  });

  it("muestra estado vacío sin movimientos", () => {
    render(<MovimientosTable movimientos={[]} />);
    expect(screen.getByText(/sin movimientos/i)).toBeInTheDocument();
  });

  it("busca por nombre", () => {
    render(
      <MovimientosTable movimientos={[mov({ nombre: "Alquiler" }), mov({ nombre: "Mercadona" })]} />,
    );
    fireEvent.change(screen.getByPlaceholderText(/buscar/i), { target: { value: "merca" } });
    expect(screen.queryByText("Alquiler")).not.toBeInTheDocument();
    expect(screen.getByText("Mercadona")).toBeInTheDocument();
  });

  it("filtra por tipo (flujo)", () => {
    render(
      <MovimientosTable
        movimientos={[mov({ nombre: "Sueldo", flujo: "ingreso" }), mov({ nombre: "Cena", flujo: "gasto" })]}
      />,
    );
    fireEvent.change(screen.getByLabelText("Filtrar por tipo"), { target: { value: "ingreso" } });
    expect(screen.getByText("Sueldo")).toBeInTheDocument();
    expect(screen.queryByText("Cena")).not.toBeInTheDocument();
  });

  it("ordena por importe al pulsar la cabecera", () => {
    const { container } = render(
      <MovimientosTable movimientos={[mov({ nombre: "A", importe: -10 }), mov({ nombre: "B", importe: -300 })]} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /importe/i })); // desc: -10 antes que -300
    const r = filas(container);
    expect(within(r[0] as HTMLElement).getByText("A")).toBeInTheDocument();
  });

  it("carga más resultados de 20 en 20", () => {
    const many = Array.from({ length: 25 }, (_, i) =>
      mov({ nombre: `Mov ${i}`, fecha: `2026-06-${String((i % 28) + 1).padStart(2, "0")}` }),
    );
    const { container } = render(<MovimientosTable movimientos={many} />);
    expect(filas(container)).toHaveLength(20);
    fireEvent.click(screen.getByRole("button", { name: /cargar más/i }));
    expect(filas(container)).toHaveLength(25);
  });
});
