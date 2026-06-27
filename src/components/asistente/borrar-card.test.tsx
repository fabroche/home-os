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

import { BorrarCard } from "@/components/asistente/borrar-card";

beforeEach(() => {
  borrarMovimiento.mockReset();
  borrarDeuda.mockReset();
});

describe("BorrarCard", () => {
  it("muestra qué se va a borrar y avisa de que es reversible", () => {
    render(<BorrarCard objetivo={{ tipo: "movimiento", id: "m1", nombre: "Café" }} />);
    expect(screen.getByText(/borrar movimiento/i)).toBeInTheDocument();
    expect(screen.getByText("Café")).toBeInTheDocument();
    expect(screen.getByText(/reversible/i)).toBeInTheDocument();
  });

  it("confirma un movimiento llamando a borrarMovimiento", async () => {
    borrarMovimiento.mockResolvedValue({ ok: true, id: "m1" });
    render(<BorrarCard objetivo={{ tipo: "movimiento", id: "m1", nombre: "Café" }} />);
    fireEvent.click(screen.getByRole("button", { name: /sí, borrar/i }));
    await waitFor(() => expect(screen.getByText(/^Borrado/)).toBeInTheDocument());
    expect(borrarMovimiento).toHaveBeenCalledWith("m1");
    expect(borrarDeuda).not.toHaveBeenCalled();
  });

  it("confirma una deuda llamando a borrarDeuda", async () => {
    borrarDeuda.mockResolvedValue({ ok: true, id: "d1" });
    render(<BorrarCard objetivo={{ tipo: "deuda", id: "d1", nombre: "Préstamo a Leo" }} />);
    fireEvent.click(screen.getByRole("button", { name: /sí, borrar/i }));
    await waitFor(() => expect(screen.getByText(/^Borrado/)).toBeInTheDocument());
    expect(borrarDeuda).toHaveBeenCalledWith("d1");
  });

  it("cancelar no borra", () => {
    render(<BorrarCard objetivo={{ tipo: "movimiento", id: "m1", nombre: "Café" }} />);
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(screen.getByText(/^Cancelado/)).toBeInTheDocument();
    expect(borrarMovimiento).not.toHaveBeenCalled();
  });

  it("muestra el error si el borrado falla", async () => {
    borrarMovimiento.mockResolvedValue({ ok: false, error: "Notion no responde" });
    render(<BorrarCard objetivo={{ tipo: "movimiento", id: "m1", nombre: "Café" }} />);
    fireEvent.click(screen.getByRole("button", { name: /sí, borrar/i }));
    await waitFor(() => expect(screen.getByText(/notion no responde/i)).toBeInTheDocument());
    expect(screen.queryByText(/^Borrado/)).not.toBeInTheDocument();
  });

  it("con varios candidatos pide elegir y luego confirma el elegido", async () => {
    borrarMovimiento.mockResolvedValue({ ok: true, id: "m2" });
    render(
      <BorrarCard
        candidatos={[
          { tipo: "movimiento", id: "m1", nombre: "Sushi con amigos" },
          { tipo: "movimiento", id: "m2", nombre: "Comida con Ana" },
        ]}
      />,
    );
    expect(screen.getByText(/cuál quieres borrar/i)).toBeInTheDocument();

    // Elegir el segundo candidato → pasa al paso de confirmación.
    fireEvent.click(screen.getByRole("button", { name: /comida con ana/i }));
    expect(screen.queryByText(/cuál quieres borrar/i)).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: /sí, borrar/i }));
    await waitFor(() => expect(borrarMovimiento).toHaveBeenCalledWith("m2"));
  });

  it("nace congelada si llega con resueltoInicial (rehidratación)", () => {
    render(<BorrarCard objetivo={{ tipo: "deuda", id: "d1", nombre: "Préstamo" }} resueltoInicial="borrado" />);
    expect(screen.getByText(/^Borrado/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sí, borrar/i })).not.toBeInTheDocument();
  });
});
