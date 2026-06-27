// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const crearCuenta = vi.fn();
const refresh = vi.fn();
vi.mock("@/lib/actions/cuentas", () => ({
  crearCuenta: (...args: unknown[]) => crearCuenta(...args),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { NuevaCuenta } from "@/components/finanzas/nueva-cuenta";

beforeEach(() => {
  crearCuenta.mockReset();
  refresh.mockReset();
});

describe("NuevaCuenta", () => {
  it("crea una cuenta con nombre, tipo y saldo inicial", async () => {
    crearCuenta.mockResolvedValue({ ok: true, id: "c1" });
    render(<NuevaCuenta />);

    fireEvent.click(screen.getByRole("button", { name: /^cuenta$/i }));
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Santander" } });
    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "ahorro" } });
    fireEvent.change(screen.getByLabelText("Saldo inicial (€)"), { target: { value: "500" } });
    fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));

    await waitFor(() => expect(crearCuenta).toHaveBeenCalled());
    expect(crearCuenta).toHaveBeenCalledWith({ nombre: "Santander", tipo: "ahorro", saldoInicial: 500 });
    expect(refresh).toHaveBeenCalled();
  });

  it("muestra el error si la creación falla", async () => {
    crearCuenta.mockResolvedValue({ ok: false, error: "Algo falló" });
    render(<NuevaCuenta />);
    fireEvent.click(screen.getByRole("button", { name: /^cuenta$/i }));
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "X" } });
    fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));
    await waitFor(() => expect(screen.getByText(/algo falló/i)).toBeInTheDocument());
  });
});
