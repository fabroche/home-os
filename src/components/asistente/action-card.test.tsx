// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const crearMovimiento = vi.fn();
vi.mock("@/lib/actions/finanzas", () => ({
  crearMovimiento: (...a: unknown[]) => crearMovimiento(...a),
}));

import { ActionCard } from "@/components/asistente/action-card";
import type { CrearMovimientoInput } from "@/types/finanzas";

const propuesta: CrearMovimientoInput = {
  nombre: "Comida en el bar",
  importe: 18.5,
  categoria: "Restaurantes",
  tipo: "Gasto Variable",
  fecha: "2026-06-23",
  estado: "Pending",
};

beforeEach(() => crearMovimiento.mockReset());

describe("ActionCard", () => {
  it("muestra la propuesta de gasto editable", () => {
    render(<ActionCard propuesta={propuesta} />);
    expect(screen.getByText(/registrar gasto/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("Comida en el bar")).toBeInTheDocument();
    expect(screen.getByDisplayValue("18.5")).toBeInTheDocument();
  });

  it("confirma y crea el movimiento con las ediciones del usuario", async () => {
    crearMovimiento.mockResolvedValue({ ok: true, id: "m1" });
    render(<ActionCard propuesta={propuesta} />);
    fireEvent.change(screen.getByDisplayValue("18.5"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: /confirmar y crear/i }));
    await waitFor(() => expect(screen.getByText(/^Gasto creado/)).toBeInTheDocument());
    expect(crearMovimiento).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: "Comida en el bar", importe: 20, categoria: "Restaurantes" }),
    );
  });

  it("cancelar no crea nada", () => {
    render(<ActionCard propuesta={propuesta} />);
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(screen.getByText(/^Cancelado/)).toBeInTheDocument();
    expect(crearMovimiento).not.toHaveBeenCalled();
  });

  it("nace congelada si llega con resueltoInicial (rehidratación)", () => {
    render(<ActionCard propuesta={propuesta} resueltoInicial="creado" />);
    expect(screen.getByText(/^Gasto creado/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /confirmar y crear/i })).not.toBeInTheDocument();
  });

  it("muestra 'reescribiste' si fue superada por un mensaje posterior", () => {
    render(<ActionCard propuesta={propuesta} resueltoInicial="superado" />);
    expect(screen.getByText(/lo reescribiste/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /confirmar y crear/i })).not.toBeInTheDocument();
  });

  it("muestra el error si la creación falla", async () => {
    crearMovimiento.mockResolvedValue({ ok: false, error: "Notion no responde" });
    render(<ActionCard propuesta={propuesta} />);
    fireEvent.click(screen.getByRole("button", { name: /confirmar y crear/i }));
    await waitFor(() => expect(screen.getByText(/notion no responde/i)).toBeInTheDocument());
    expect(screen.queryByText(/^Gasto creado/)).not.toBeInTheDocument();
  });
});
