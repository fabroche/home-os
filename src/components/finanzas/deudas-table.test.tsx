// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Deuda } from "@/types/finanzas";

// Las acciones (edición/borrado) usan Server Actions + router; se mockean para el render.
vi.mock("@/lib/actions/finanzas", () => ({
  editarDeuda: vi.fn(),
  borrarDeuda: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { DeudasTable } from "@/components/finanzas/deudas-table";

const deuda = (over: Partial<Deuda>): Deuda => ({
  id: crypto.randomUUID(),
  notionPageId: null,
  concepto: "Préstamo",
  fechaCreacion: "2026-07-01",
  valor: -100,
  persona: "Leo",
  ultimaEdicion: "2026-07-01T00:00:00Z",
  ...over,
});

describe("DeudasTable", () => {
  it("renderiza las filas con concepto, persona y valor", () => {
    render(<DeudasTable deudas={[deuda({ concepto: "Préstamo a Leo", persona: "Leo" })]} />);
    expect(screen.getByText("Préstamo a Leo")).toBeInTheDocument();
    expect(screen.getByText("Leo")).toBeInTheDocument();
  });

  it("muestra estado vacío sin deudas", () => {
    render(<DeudasTable deudas={[]} />);
    expect(screen.getByText(/sin deudas/i)).toBeInTheDocument();
  });

  it("el lápiz despliega el formulario de edición en línea", () => {
    render(<DeudasTable deudas={[deuda({ concepto: "Préstamo a Leo" })]} personas={["Leo"]} />);
    expect(screen.queryByRole("button", { name: /guardar/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /editar préstamo a leo/i }));
    expect(screen.getByRole("button", { name: /guardar/i })).toBeInTheDocument();
  });
});
