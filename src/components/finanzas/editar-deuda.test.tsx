// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Deuda } from "@/types/finanzas";

const editarDeuda = vi.fn();
vi.mock("@/lib/actions/finanzas", () => ({
  editarDeuda: (...a: unknown[]) => editarDeuda(...a),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { EditarDeuda } from "@/components/finanzas/editar-deuda";

const deuda = (over: Partial<Deuda> = {}): Deuda => ({
  id: "d1",
  notionPageId: null,
  concepto: "Préstamo",
  fechaCreacion: "2026-07-01",
  valor: -100,
  persona: "Leo",
  ultimaEdicion: "2026-07-01T00:00:00Z",
  ...over,
});

beforeEach(() => editarDeuda.mockReset());

describe("EditarDeuda", () => {
  it("prefila concepto, valor en positivo y tipo 'deuda' para un valor negativo", () => {
    render(<EditarDeuda deuda={deuda()} personas={["Leo"]} />);
    expect(screen.getByDisplayValue("Préstamo")).toBeInTheDocument();
    expect(screen.getByDisplayValue("100")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Deuda (resta)")).toBeInTheDocument();
  });

  it("un valor positivo se edita como 'pago'", () => {
    render(<EditarDeuda deuda={deuda({ valor: 150, concepto: "Pago" })} personas={["Leo"]} />);
    expect(screen.getByDisplayValue("Pago (suma)")).toBeInTheDocument();
    expect(screen.getByDisplayValue("150")).toBeInTheDocument();
  });

  it("al guardar llama a editarDeuda con el id y los campos re-firmados", async () => {
    editarDeuda.mockResolvedValue({ ok: true, id: "d1" });
    render(<EditarDeuda deuda={deuda()} personas={["Leo"]} />);
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));
    await waitFor(() => expect(editarDeuda).toHaveBeenCalled());
    expect(editarDeuda.mock.calls[0][0]).toMatchObject({
      id: "d1",
      concepto: "Préstamo",
      persona: "Leo",
      valor: 100,
      movimiento: "deuda",
    });
  });

  it("Cancelar llama a onDone sin guardar", () => {
    const onDone = vi.fn();
    render(<EditarDeuda deuda={deuda()} personas={["Leo"]} onDone={onDone} />);
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onDone).toHaveBeenCalled();
    expect(editarDeuda).not.toHaveBeenCalled();
  });
});
