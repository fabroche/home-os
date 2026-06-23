// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const crearDeuda = vi.fn();
vi.mock("@/lib/actions/finanzas", () => ({
  crearDeuda: (...a: unknown[]) => crearDeuda(...a),
}));

import { DeudaCard } from "@/components/asistente/deuda-card";
import type { CrearDeudaInput } from "@/types/finanzas";

const propuesta: CrearDeudaInput = {
  concepto: "Préstamo",
  persona: "Leo",
  valor: 50,
  movimiento: "deuda",
  fecha: "2026-06-23",
};

beforeEach(() => crearDeuda.mockReset());

describe("DeudaCard", () => {
  it("muestra la propuesta editable", () => {
    render(<DeudaCard propuesta={propuesta} />);
    expect(screen.getByText(/registrar deuda/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("Préstamo")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Leo")).toBeInTheDocument();
  });

  it("confirma y registra la deuda", async () => {
    crearDeuda.mockResolvedValue({ ok: true, id: "d1" });
    render(<DeudaCard propuesta={propuesta} />);
    fireEvent.click(screen.getByRole("button", { name: /confirmar y registrar/i }));
    await waitFor(() => expect(screen.getByText(/^Registrado/)).toBeInTheDocument());
    expect(crearDeuda).toHaveBeenCalledWith(
      expect.objectContaining({ persona: "Leo", valor: 50, movimiento: "deuda" }),
    );
  });

  it("cancelar no registra nada", () => {
    render(<DeudaCard propuesta={propuesta} />);
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(screen.getByText(/^Cancelado/)).toBeInTheDocument();
    expect(crearDeuda).not.toHaveBeenCalled();
  });
});
