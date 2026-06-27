// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const crearMovimiento = vi.fn();
const refresh = vi.fn();
vi.mock("@/lib/actions/finanzas", () => ({
  crearMovimiento: (...args: unknown[]) => crearMovimiento(...args),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { NuevoMovimiento } from "@/components/finanzas/nuevo-movimiento";

beforeEach(() => {
  crearMovimiento.mockReset();
  refresh.mockReset();
});

describe("NuevoMovimiento", () => {
  it("abre el formulario, crea el movimiento y cierra", async () => {
    crearMovimiento.mockResolvedValue({ ok: true, id: "m1" });
    render(<NuevoMovimiento />);

    fireEvent.click(screen.getByRole("button", { name: /nuevo movimiento/i }));
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Alquiler" } });
    fireEvent.change(screen.getByLabelText("Importe (€)"), { target: { value: "700" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear" }));

    await waitFor(() => expect(crearMovimiento).toHaveBeenCalled());
    expect(crearMovimiento).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: "Alquiler", importe: 700, tipo: "Gasto Variable" }),
    );
    expect(refresh).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /nuevo movimiento/i })).toBeInTheDocument(),
    );
  });

  it("etiqueta el movimiento con cuenta, tarjeta y persona", async () => {
    crearMovimiento.mockResolvedValue({ ok: true, id: "m2" });
    render(
      <NuevoMovimiento
        cuentas={[{ id: "c1", nombre: "Santander" }]}
        tarjetas={[{ id: "t1", nombre: "Visa" }]}
        personas={["Ana"]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /nuevo movimiento/i }));
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Sushi" } });
    fireEvent.change(screen.getByLabelText("Importe (€)"), { target: { value: "21" } });
    fireEvent.change(screen.getByLabelText("Cuenta"), { target: { value: "c1" } });
    fireEvent.change(screen.getByLabelText("Tarjeta"), { target: { value: "t1" } });
    fireEvent.change(screen.getByLabelText("Persona"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear" }));

    await waitFor(() => expect(crearMovimiento).toHaveBeenCalled());
    expect(crearMovimiento).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: "Sushi", cuentaId: "c1", tarjetaId: "t1", persona: "Ana" }),
    );
  });

  it("muestra errores de campo y no cierra", async () => {
    crearMovimiento.mockResolvedValue({
      ok: false,
      error: "Revisa los campos.",
      fieldErrors: { nombre: "El nombre es obligatorio" },
    });
    render(<NuevoMovimiento />);
    fireEvent.click(screen.getByRole("button", { name: /nuevo movimiento/i }));
    fireEvent.change(screen.getByLabelText("Importe (€)"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear" }));

    await waitFor(() =>
      expect(screen.getByText("El nombre es obligatorio")).toBeInTheDocument(),
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});
