// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const pagarExtracto = vi.fn();
vi.mock("@/lib/actions/finanzas", () => ({
  pagarExtracto: (...a: unknown[]) => pagarExtracto(...a),
}));

import { PagarExtractoButton } from "@/components/finanzas/pagar-extracto-button";

beforeEach(() => {
  pagarExtracto.mockReset();
});

describe("PagarExtractoButton", () => {
  it("pide confirmación con el importe antes de pagar (no paga al primer click)", () => {
    render(<PagarExtractoButton tarjetaId="tc1" total={1000} />);
    fireEvent.click(screen.getByRole("button", { name: /pagar extracto/i }));
    expect(screen.getByText(/¿pagar/i)).toBeInTheDocument();
    expect(pagarExtracto).not.toHaveBeenCalled();
  });

  it("al confirmar llama a pagarExtracto con el tarjetaId", async () => {
    pagarExtracto.mockResolvedValue({ ok: true, id: "tc1" });
    render(<PagarExtractoButton tarjetaId="tc1" total={1000} />);
    fireEvent.click(screen.getByRole("button", { name: /pagar extracto/i }));
    fireEvent.click(screen.getByRole("button", { name: "Sí" }));
    await waitFor(() => expect(pagarExtracto).toHaveBeenCalledWith("tc1"));
  });

  it("cancelar vuelve atrás sin pagar", () => {
    render(<PagarExtractoButton tarjetaId="tc1" total={1000} />);
    fireEvent.click(screen.getByRole("button", { name: /pagar extracto/i }));
    fireEvent.click(screen.getByRole("button", { name: "No" }));
    expect(screen.queryByText(/¿pagar/i)).not.toBeInTheDocument();
    expect(pagarExtracto).not.toHaveBeenCalled();
  });

  it("muestra el error si la acción falla", async () => {
    pagarExtracto.mockResolvedValue({ ok: false, error: "No se pudo liquidar" });
    render(<PagarExtractoButton tarjetaId="tc1" total={1000} />);
    fireEvent.click(screen.getByRole("button", { name: /pagar extracto/i }));
    fireEvent.click(screen.getByRole("button", { name: "Sí" }));
    await waitFor(() => expect(screen.getByText(/no se pudo liquidar/i)).toBeInTheDocument());
  });
});
