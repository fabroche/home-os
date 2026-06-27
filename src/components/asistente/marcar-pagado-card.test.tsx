// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const cambiarEstadoMovimiento = vi.fn();
vi.mock("@/lib/actions/finanzas", () => ({
  cambiarEstadoMovimiento: (...a: unknown[]) => cambiarEstadoMovimiento(...a),
}));

import { MarcarPagadoCard } from "@/components/asistente/marcar-pagado-card";

const movimiento = { id: "pg1", nombre: "Recibo de la luz", importe: 42.3 };

beforeEach(() => cambiarEstadoMovimiento.mockReset());

describe("MarcarPagadoCard", () => {
  it("muestra el gasto que va a marcar", () => {
    render(<MarcarPagadoCard movimiento={movimiento} />);
    expect(screen.getByText(/marcar como pagado/i)).toBeInTheDocument();
    expect(screen.getByText(/recibo de la luz/i)).toBeInTheDocument();
  });

  it("confirma y marca como pagado (Done)", async () => {
    cambiarEstadoMovimiento.mockResolvedValue({ ok: true, id: "pg1" });
    render(<MarcarPagadoCard movimiento={movimiento} />);
    fireEvent.click(screen.getByRole("button", { name: /s[ií], marcar pagado/i }));
    await waitFor(() => expect(screen.getByText(/marcado como pagado/i)).toBeInTheDocument());
    expect(cambiarEstadoMovimiento).toHaveBeenCalledWith("pg1", "Done");
  });

  it("cancelar no marca nada", () => {
    render(<MarcarPagadoCard movimiento={movimiento} />);
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(screen.getByText(/^Cancelado/)).toBeInTheDocument();
    expect(cambiarEstadoMovimiento).not.toHaveBeenCalled();
  });

  it("con varios candidatos pide elegir y luego confirma el elegido", async () => {
    cambiarEstadoMovimiento.mockResolvedValue({ ok: true, id: "pg2" });
    render(
      <MarcarPagadoCard
        candidatos={[
          { id: "pg1", nombre: "Comida en el bar", importe: 12 },
          { id: "pg2", nombre: "Comida con Ana", importe: 18 },
        ]}
      />,
    );
    expect(screen.getByText(/cuál marco como pagado/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /comida con ana/i }));
    expect(screen.queryByText(/cuál marco como pagado/i)).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: /s[ií], marcar pagado/i }));
    await waitFor(() => expect(cambiarEstadoMovimiento).toHaveBeenCalledWith("pg2", "Done"));
  });
});
