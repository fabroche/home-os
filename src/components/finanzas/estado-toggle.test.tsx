// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const cambiarEstadoMovimiento = vi.fn();
vi.mock("@/lib/actions/finanzas", () => ({
  cambiarEstadoMovimiento: (...args: unknown[]) => cambiarEstadoMovimiento(...args),
}));

import { EstadoToggle } from "@/components/finanzas/estado-toggle";

beforeEach(() => cambiarEstadoMovimiento.mockReset());

describe("EstadoToggle", () => {
  it("muestra Pendiente y cambia a Pagado al pulsar", async () => {
    cambiarEstadoMovimiento.mockResolvedValue({ ok: true, id: "p1" });
    render(<EstadoToggle pageId="p1" estado="Pending" />);
    expect(screen.getByRole("button", { name: /pendiente/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByText(/pagado/i)).toBeInTheDocument());
    expect(cambiarEstadoMovimiento).toHaveBeenCalledWith("p1", "Done");
  });

  it("desde Done envía Pending", async () => {
    cambiarEstadoMovimiento.mockResolvedValue({ ok: true, id: "p1" });
    render(<EstadoToggle pageId="p1" estado="Done" />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(cambiarEstadoMovimiento).toHaveBeenCalledWith("p1", "Pending"));
  });

  it("no cambia el label si la acción falla", async () => {
    cambiarEstadoMovimiento.mockResolvedValue({ ok: false, error: "x" });
    render(<EstadoToggle pageId="p1" estado="Pending" />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(cambiarEstadoMovimiento).toHaveBeenCalled());
    expect(screen.getByText(/pendiente/i)).toBeInTheDocument();
  });
});
