// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { GastoRecurrente } from "@/types/recurrentes";

const crearGastoRecurrente = vi.fn();
const archivarRecurrente = vi.fn();
vi.mock("@/lib/actions/gastos-recurrentes", () => ({
  crearGastoRecurrente: (...a: unknown[]) => crearGastoRecurrente(...a),
  archivarRecurrente: (...a: unknown[]) => archivarRecurrente(...a),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { GastosRecurrentesCard } from "@/components/finanzas/gastos-recurrentes-card";

const rec = (over: Partial<GastoRecurrente> = {}): GastoRecurrente => ({
  id: "r1",
  concepto: "Alquiler",
  monto: 800,
  categoria: "Casa",
  tipo: "Gasto Fijo",
  diaMes: 1,
  fechaInicio: "2026-01-01",
  activo: true,
  ...over,
});

beforeEach(() => {
  crearGastoRecurrente.mockReset();
  archivarRecurrente.mockReset();
});

describe("GastosRecurrentesCard", () => {
  it("lista los recurrentes con concepto, categoría, día e importe", () => {
    render(<GastosRecurrentesCard recurrentes={[rec()]} />);
    expect(screen.getByText("Alquiler")).toBeInTheDocument();
    expect(screen.getByText(/casa · día 1/i)).toBeInTheDocument();
    expect(screen.getByText(/800,00\s*€\/mes/)).toBeInTheDocument();
  });

  it("estado vacío sin recurrentes", () => {
    render(<GastosRecurrentesCard recurrentes={[]} />);
    expect(screen.getByText(/sin gastos recurrentes/i)).toBeInTheDocument();
  });

  it("el formulario crea un recurrente con concepto, monto y día", async () => {
    crearGastoRecurrente.mockResolvedValue({ ok: true, id: "r2" });
    render(<GastosRecurrentesCard recurrentes={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /recurrente/i }));
    fireEvent.change(screen.getByLabelText("Concepto"), { target: { value: "Spotify" } });
    fireEvent.change(screen.getByLabelText("Importe (€/mes)"), { target: { value: "11" } });
    fireEvent.change(screen.getByLabelText("Día del mes"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: /crear recurrente/i }));
    await waitFor(() =>
      expect(crearGastoRecurrente).toHaveBeenCalledWith(
        expect.objectContaining({ concepto: "Spotify", monto: 11, diaMes: 5 }),
      ),
    );
  });

  it("archivar llama a archivarRecurrente con el id", async () => {
    archivarRecurrente.mockResolvedValue({ ok: true, id: "r1" });
    render(<GastosRecurrentesCard recurrentes={[rec()]} />);
    fireEvent.click(screen.getByRole("button", { name: /archivar alquiler/i }));
    await waitFor(() => expect(archivarRecurrente).toHaveBeenCalledWith("r1"));
  });
});
