// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Movimiento } from "@/types/finanzas";

const editarMovimiento = vi.fn();
vi.mock("@/lib/actions/finanzas", () => ({
  editarMovimiento: (...a: unknown[]) => editarMovimiento(...a),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { EditarMovimiento } from "@/components/finanzas/editar-movimiento";

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

beforeEach(() => editarMovimiento.mockReset());

describe("EditarMovimiento", () => {
  it("prefila el nombre y el importe en positivo (magnitud)", () => {
    render(<EditarMovimiento movimiento={mov()} />);
    expect(screen.getByDisplayValue("Mercadona")).toBeInTheDocument();
    expect(screen.getByDisplayValue("42.5")).toBeInTheDocument();
  });

  it("al guardar llama a editarMovimiento con el id y los campos", async () => {
    editarMovimiento.mockResolvedValue({ ok: true, id: "m1" });
    render(<EditarMovimiento movimiento={mov()} />);
    fireEvent.change(screen.getByDisplayValue("Mercadona"), { target: { value: "Mercadona semanal" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));
    await waitFor(() => expect(editarMovimiento).toHaveBeenCalled());
    expect(editarMovimiento.mock.calls[0][0]).toMatchObject({
      id: "m1",
      nombre: "Mercadona semanal",
      importe: 42.5,
    });
  });

  it("muestra el error si la acción falla", async () => {
    editarMovimiento.mockResolvedValue({ ok: false, error: "No se pudo editar" });
    render(<EditarMovimiento movimiento={mov()} />);
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));
    await waitFor(() => expect(screen.getByText(/no se pudo editar/i)).toBeInTheDocument());
  });

  it("Cancelar llama a onDone sin guardar", () => {
    const onDone = vi.fn();
    render(<EditarMovimiento movimiento={mov()} onDone={onDone} />);
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onDone).toHaveBeenCalled();
    expect(editarMovimiento).not.toHaveBeenCalled();
  });
});
