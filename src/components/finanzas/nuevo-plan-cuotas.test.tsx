// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const crearPlanCuotas = vi.fn();
const refresh = vi.fn();
vi.mock("@/lib/actions/cuotas", () => ({
  crearPlanCuotas: (...args: unknown[]) => crearPlanCuotas(...args),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { NuevoPlanCuotas } from "@/components/finanzas/nuevo-plan-cuotas";

const TARJETAS = [{ id: "t1", nombre: "Visa" }];

beforeEach(() => {
  crearPlanCuotas.mockReset();
  refresh.mockReset();
});

describe("NuevoPlanCuotas", () => {
  it("crea un plan a plazos con total, nº de cuotas y tarjeta", async () => {
    crearPlanCuotas.mockResolvedValue({ ok: true, id: "plan-1" });
    render(<NuevoPlanCuotas tarjetas={TARJETAS} personas={["Ana"]} />);

    fireEvent.click(screen.getByRole("button", { name: /gasto a plazos/i }));
    fireEvent.change(screen.getByLabelText("Concepto"), { target: { value: "Portátil" } });
    fireEvent.change(screen.getByLabelText("Total (€)"), { target: { value: "1000" } });
    fireEvent.change(screen.getByLabelText("Nº de cuotas"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Tarjeta"), { target: { value: "t1" } });
    fireEvent.click(screen.getByRole("button", { name: /crear plan/i }));

    await waitFor(() => expect(crearPlanCuotas).toHaveBeenCalled());
    expect(crearPlanCuotas).toHaveBeenCalledWith(
      expect.objectContaining({ concepto: "Portátil", montoTotal: 1000, numCuotas: 10, tarjetaId: "t1" }),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("muestra el error si la creación falla", async () => {
    crearPlanCuotas.mockResolvedValue({ ok: false, error: "Algo falló" });
    render(<NuevoPlanCuotas tarjetas={TARJETAS} />);
    fireEvent.click(screen.getByRole("button", { name: /gasto a plazos/i }));
    fireEvent.change(screen.getByLabelText("Concepto"), { target: { value: "X" } });
    fireEvent.change(screen.getByLabelText("Total (€)"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: /crear plan/i }));
    await waitFor(() => expect(screen.getByText(/algo falló/i)).toBeInTheDocument());
  });
});
