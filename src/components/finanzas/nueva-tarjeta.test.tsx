// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const crearTarjeta = vi.fn();
const refresh = vi.fn();
vi.mock("@/lib/actions/cuentas", () => ({
  crearTarjeta: (...args: unknown[]) => crearTarjeta(...args),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { NuevaTarjeta } from "@/components/finanzas/nueva-tarjeta";

const CUENTAS = [{ id: "c1", nombre: "Santander" }];

beforeEach(() => {
  crearTarjeta.mockReset();
  refresh.mockReset();
});

describe("NuevaTarjeta", () => {
  it("crea una tarjeta de débito sin propiedades de crédito", async () => {
    crearTarjeta.mockResolvedValue({ ok: true, id: "t1" });
    render(<NuevaTarjeta cuentas={CUENTAS} />);

    fireEvent.click(screen.getByRole("button", { name: /^tarjeta$/i }));
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Maestro" } });
    // tipo por defecto: débito → no hay campos de crédito
    expect(screen.queryByLabelText("Límite (€)")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /crear tarjeta/i }));

    await waitFor(() => expect(crearTarjeta).toHaveBeenCalled());
    expect(crearTarjeta).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: "Maestro", tipo: "debito", limite: null, diaCorte: null, diaPago: null }),
    );
  });

  it("crédito muestra y envía límite y días de corte/pago", async () => {
    crearTarjeta.mockResolvedValue({ ok: true, id: "t2" });
    render(<NuevaTarjeta cuentas={CUENTAS} />);

    fireEvent.click(screen.getByRole("button", { name: /^tarjeta$/i }));
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Visa" } });
    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "credito" } });
    fireEvent.change(screen.getByLabelText("Cuenta"), { target: { value: "c1" } });
    fireEvent.change(screen.getByLabelText("Límite (€)"), { target: { value: "2000" } });
    fireEvent.change(screen.getByLabelText("Día de corte"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Día de pago"), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: /crear tarjeta/i }));

    await waitFor(() => expect(crearTarjeta).toHaveBeenCalled());
    expect(crearTarjeta).toHaveBeenCalledWith({
      nombre: "Visa",
      tipo: "credito",
      cuentaId: "c1",
      limite: 2000,
      diaCorte: 5,
      diaPago: 25,
    });
  });
});
