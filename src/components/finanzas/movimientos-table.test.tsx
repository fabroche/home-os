// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import type { Movimiento } from "@/types/finanzas";

// Las celdas hijas usan Server Actions + router; se mockean para el render.
vi.mock("@/lib/actions/finanzas", () => ({
  cambiarEstadoMovimiento: vi.fn(),
  subirArchivoMovimiento: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { MovimientosTable } from "@/components/finanzas/movimientos-table";

const mov = (over: Partial<Movimiento>): Movimiento => ({
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

describe("MovimientosTable", () => {
  it("renderiza filas con nombre, estado e importe", () => {
    render(
      <MovimientosTable
        movimientos={[mov({ nombre: "Alquiler", importe: -700, estado: "Pending" })]}
      />,
    );
    expect(screen.getByText("Alquiler")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pendiente/i })).toBeInTheDocument();
    expect(screen.getByText(/-700,00/)).toBeInTheDocument();
  });

  it("muestra estado vacío sin movimientos", () => {
    render(<MovimientosTable movimientos={[]} />);
    expect(screen.getByText(/sin movimientos/i)).toBeInTheDocument();
  });
});
