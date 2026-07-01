// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const crearCuenta = vi.fn();
const crearTarjeta = vi.fn();
const crearPlanCuotas = vi.fn();
const guardarPresupuesto = vi.fn();
const crearGastoRecurrente = vi.fn();
vi.mock("@/lib/actions/cuentas", () => ({
  crearCuenta: (...a: unknown[]) => crearCuenta(...a),
  crearTarjeta: (...a: unknown[]) => crearTarjeta(...a),
}));
vi.mock("@/lib/actions/cuotas", () => ({ crearPlanCuotas: (...a: unknown[]) => crearPlanCuotas(...a) }));
vi.mock("@/lib/actions/presupuestos", () => ({ guardarPresupuesto: (...a: unknown[]) => guardarPresupuesto(...a) }));
vi.mock("@/lib/actions/gastos-recurrentes", () => ({
  crearGastoRecurrente: (...a: unknown[]) => crearGastoRecurrente(...a),
}));

import { HerramientaCard } from "@/components/asistente/herramienta-card";

const opciones = {
  cuentas: [{ id: "c1", nombre: "Principal" }],
  tarjetas: [{ id: "t1", nombre: "Visa" }],
  personas: ["Leo"],
};

beforeEach(() => {
  crearCuenta.mockReset();
  guardarPresupuesto.mockReset();
});

describe("HerramientaCard", () => {
  it("prefila los campos de la herramienta desde la propuesta", () => {
    render(
      <HerramientaCard
        herramienta="crear_cuenta"
        propuesta={{ nombre: "Ahorros", tipo: "ahorro", saldoInicial: 500 }}
        opciones={opciones}
      />,
    );
    expect(screen.getByDisplayValue("Ahorros")).toBeInTheDocument();
    expect(screen.getByDisplayValue("500")).toBeInTheDocument();
  });

  it("confirmar llama a la Server Action mapeada con el payload (números coercidos)", async () => {
    crearCuenta.mockResolvedValue({ ok: true, id: "x" });
    render(
      <HerramientaCard
        herramienta="crear_cuenta"
        propuesta={{ nombre: "Ahorros", tipo: "ahorro", saldoInicial: 500 }}
        opciones={opciones}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));
    await waitFor(() =>
      expect(crearCuenta).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: "Ahorros", tipo: "ahorro", saldoInicial: 500 }),
      ),
    );
  });

  it("mapea crear_presupuesto a guardarPresupuesto", async () => {
    guardarPresupuesto.mockResolvedValue({ ok: true, id: "p" });
    render(
      <HerramientaCard
        herramienta="crear_presupuesto"
        propuesta={{ categoria: "Comida", monto: 250 }}
        opciones={opciones}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /guardar presupuesto/i }));
    await waitFor(() =>
      expect(guardarPresupuesto).toHaveBeenCalledWith(expect.objectContaining({ categoria: "Comida", monto: 250 })),
    );
  });

  it("muestra el error si la acción falla", async () => {
    crearCuenta.mockResolvedValue({ ok: false, error: "No se pudo crear" });
    render(<HerramientaCard herramienta="crear_cuenta" propuesta={{ nombre: "X" }} opciones={opciones} />);
    fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));
    await waitFor(() => expect(screen.getByText(/no se pudo crear/i)).toBeInTheDocument());
  });

  it("Cancelar resuelve la card sin llamar a ninguna acción", () => {
    const onResuelto = vi.fn();
    render(
      <HerramientaCard
        herramienta="crear_cuenta"
        propuesta={{ nombre: "X" }}
        opciones={opciones}
        onResuelto={onResuelto}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onResuelto).toHaveBeenCalledWith("cancelado");
    expect(crearCuenta).not.toHaveBeenCalled();
  });
});
