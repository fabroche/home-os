// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { PresupuestoItem } from "@/lib/finanzas/aggregations";

const guardarPresupuesto = vi.fn();
const borrarPresupuesto = vi.fn();
vi.mock("@/lib/actions/presupuestos", () => ({
  guardarPresupuesto: (...a: unknown[]) => guardarPresupuesto(...a),
  borrarPresupuesto: (...a: unknown[]) => borrarPresupuesto(...a),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { PresupuestosCard } from "@/components/finanzas/presupuestos-card";

const categorias = ["Comida", "Casa"] as const;
const item = (over: Partial<PresupuestoItem> = {}): PresupuestoItem => ({
  id: "p1",
  categoria: "Comida",
  tope: 250,
  gastado: 210,
  pct: 84,
  excedido: false,
  ...over,
});

beforeEach(() => {
  guardarPresupuesto.mockReset();
  borrarPresupuesto.mockReset();
});

describe("PresupuestosCard", () => {
  it("muestra el % y el gastado/tope de cada presupuesto", () => {
    render(<PresupuestosCard items={[item()]} categorias={categorias} mesLabel="julio 2026" />);
    expect(screen.getByText("Comida")).toBeInTheDocument();
    expect(screen.getByText("84%")).toBeInTheDocument();
  });

  it("estado vacío sin presupuestos", () => {
    render(<PresupuestosCard items={[]} categorias={categorias} mesLabel="julio 2026" />);
    expect(screen.getByText(/aún no tienes presupuestos/i)).toBeInTheDocument();
  });

  it("el formulario guarda un tope con categoría y monto", async () => {
    guardarPresupuesto.mockResolvedValue({ ok: true, id: "p2" });
    render(<PresupuestosCard items={[]} categorias={categorias} mesLabel="julio 2026" />);
    fireEvent.click(screen.getByRole("button", { name: /presupuesto/i }));
    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: "Casa" } });
    fireEvent.change(screen.getByLabelText("Tope mensual"), { target: { value: "800" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));
    await waitFor(() =>
      expect(guardarPresupuesto).toHaveBeenCalledWith(
        expect.objectContaining({ categoria: "Casa", monto: 800 }),
      ),
    );
  });

  it("el botón de borrar llama a borrarPresupuesto con el id", async () => {
    borrarPresupuesto.mockResolvedValue({ ok: true, id: "p1" });
    render(<PresupuestosCard items={[item()]} categorias={categorias} mesLabel="julio 2026" />);
    fireEvent.click(screen.getByRole("button", { name: /borrar presupuesto de comida/i }));
    await waitFor(() => expect(borrarPresupuesto).toHaveBeenCalledWith("p1"));
  });
});
