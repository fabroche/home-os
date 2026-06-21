// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const crearDeuda = vi.fn();
const refresh = vi.fn();
vi.mock("@/lib/actions/finanzas", () => ({
  crearDeuda: (...args: unknown[]) => crearDeuda(...args),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { NuevaDeuda } from "@/components/finanzas/nueva-deuda";

const PERSONAS = ["Leo", "Guille"];

beforeEach(() => {
  crearDeuda.mockReset();
  refresh.mockReset();
});

describe("NuevaDeuda", () => {
  it("registra una deuda con la persona existente seleccionada por defecto", async () => {
    crearDeuda.mockResolvedValue({ ok: true, id: "d1" });
    render(<NuevaDeuda personas={PERSONAS} />);

    fireEvent.click(screen.getByRole("button", { name: /deuda \/ pago/i }));
    fireEvent.change(screen.getByLabelText("Concepto"), { target: { value: "Préstamo" } });
    fireEvent.change(screen.getByLabelText("Valor (€)"), { target: { value: "450" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));

    await waitFor(() => expect(crearDeuda).toHaveBeenCalled());
    expect(crearDeuda).toHaveBeenCalledWith(
      expect.objectContaining({ concepto: "Préstamo", valor: 450, movimiento: "deuda", persona: "Leo" }),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("permite elegir otra persona existente", async () => {
    crearDeuda.mockResolvedValue({ ok: true, id: "d2" });
    render(<NuevaDeuda personas={PERSONAS} />);
    fireEvent.click(screen.getByRole("button", { name: /deuda \/ pago/i }));
    fireEvent.change(screen.getByLabelText("Concepto"), { target: { value: "x" } });
    fireEvent.change(screen.getByLabelText("Persona"), { target: { value: "Guille" } });
    fireEvent.change(screen.getByLabelText("Valor (€)"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));

    await waitFor(() => expect(crearDeuda).toHaveBeenCalled());
    expect(crearDeuda).toHaveBeenCalledWith(expect.objectContaining({ persona: "Guille" }));
  });

  it("permite crear una persona nueva", async () => {
    crearDeuda.mockResolvedValue({ ok: true, id: "d3" });
    render(<NuevaDeuda personas={PERSONAS} />);
    fireEvent.click(screen.getByRole("button", { name: /deuda \/ pago/i }));
    fireEvent.change(screen.getByLabelText("Concepto"), { target: { value: "Nueva" } });
    fireEvent.change(screen.getByLabelText("Persona"), { target: { value: "__nueva__" } });
    fireEvent.change(screen.getByLabelText("Nueva persona"), { target: { value: "Marta" } });
    fireEvent.change(screen.getByLabelText("Valor (€)"), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));

    await waitFor(() => expect(crearDeuda).toHaveBeenCalled());
    expect(crearDeuda).toHaveBeenCalledWith(expect.objectContaining({ persona: "Marta" }));
  });

  it("registra un pago (movimiento = pago)", async () => {
    crearDeuda.mockResolvedValue({ ok: true, id: "d4" });
    render(<NuevaDeuda personas={PERSONAS} />);
    fireEvent.click(screen.getByRole("button", { name: /deuda \/ pago/i }));
    fireEvent.change(screen.getByLabelText("Concepto"), { target: { value: "Pago mensual" } });
    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "pago" } });
    fireEvent.change(screen.getByLabelText("Valor (€)"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));

    await waitFor(() => expect(crearDeuda).toHaveBeenCalled());
    expect(crearDeuda).toHaveBeenCalledWith(expect.objectContaining({ movimiento: "pago", valor: 100 }));
  });
});
