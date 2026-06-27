// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const borrarMovimiento = vi.fn();
const borrarDeuda = vi.fn();
vi.mock("@/lib/actions/finanzas", () => ({
  borrarMovimiento: (...a: unknown[]) => borrarMovimiento(...a),
  borrarDeuda: (...a: unknown[]) => borrarDeuda(...a),
}));

import { BorrarButton } from "@/components/finanzas/borrar-button";

beforeEach(() => {
  borrarMovimiento.mockReset();
  borrarDeuda.mockReset();
});

describe("BorrarButton", () => {
  it("pide confirmación antes de borrar (no borra al primer click)", () => {
    render(<BorrarButton tipo="movimiento" pageId="p1" />);
    fireEvent.click(screen.getByRole("button", { name: /borrar/i }));
    expect(screen.getByText("¿Borrar?")).toBeInTheDocument();
    expect(borrarMovimiento).not.toHaveBeenCalled();
  });

  it("al confirmar llama a borrarMovimiento con el pageId", async () => {
    borrarMovimiento.mockResolvedValue({ ok: true, id: "p1" });
    render(<BorrarButton tipo="movimiento" pageId="p1" />);
    fireEvent.click(screen.getByRole("button", { name: /borrar/i }));
    fireEvent.click(screen.getByRole("button", { name: "Sí" }));
    await waitFor(() => expect(borrarMovimiento).toHaveBeenCalledWith("p1"));
    expect(borrarDeuda).not.toHaveBeenCalled();
  });

  it("cancelar vuelve atrás sin borrar", () => {
    render(<BorrarButton tipo="deuda" pageId="d1" />);
    fireEvent.click(screen.getByRole("button", { name: /borrar/i }));
    fireEvent.click(screen.getByRole("button", { name: "No" }));
    expect(screen.queryByText("¿Borrar?")).not.toBeInTheDocument();
    expect(borrarDeuda).not.toHaveBeenCalled();
  });

  it("tipo deuda usa borrarDeuda y muestra el error si falla", async () => {
    borrarDeuda.mockResolvedValue({ ok: false, error: "Notion no responde" });
    render(<BorrarButton tipo="deuda" pageId="d1" />);
    fireEvent.click(screen.getByRole("button", { name: /borrar/i }));
    fireEvent.click(screen.getByRole("button", { name: "Sí" }));
    await waitFor(() => expect(screen.getByText(/notion no responde/i)).toBeInTheDocument());
    expect(borrarMovimiento).not.toHaveBeenCalled();
  });
});
