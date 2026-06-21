// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock de la Server Action (evita cargar server-only en el test).
const guardarEntrada = vi.fn();
vi.mock("@/lib/actions/contexto", () => ({
  guardarEntrada: (...args: unknown[]) => guardarEntrada(...args),
}));

import { EditorEntrada } from "@/components/contexto/editor-entrada";

beforeEach(() => guardarEntrada.mockReset());

describe("EditorEntrada", () => {
  it("envía el formulario y cierra al guardar con éxito", async () => {
    guardarEntrada.mockResolvedValue({ ok: true, id: "abc" });
    const onClose = vi.fn();
    render(<EditorEntrada onClose={onClose} />);

    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Mercadona" } });
    fireEvent.change(screen.getByLabelText("Contenido"), { target: { value: "es Comida" } });
    fireEvent.change(screen.getByLabelText("Tags (separados por comas)"), {
      target: { value: "comida, super" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(guardarEntrada).toHaveBeenCalledWith(
      expect.objectContaining({
        titulo: "Mercadona",
        contenido: "es Comida",
        tags: ["comida", "super"],
        tipo: "regla_financiera",
      }),
    );
  });

  it("muestra errores de campo y no cierra", async () => {
    guardarEntrada.mockResolvedValue({
      ok: false,
      error: "Revisa los campos.",
      fieldErrors: { titulo: "El título es obligatorio" },
    });
    const onClose = vi.fn();
    render(<EditorEntrada onClose={onClose} />);

    fireEvent.change(screen.getByLabelText("Contenido"), { target: { value: "algo" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(screen.getByText("El título es obligatorio")).toBeInTheDocument(),
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("precarga los valores al editar", () => {
    render(
      <EditorEntrada
        onClose={() => {}}
        entrada={{
          id: "11111111-1111-1111-1111-111111111111",
          tipo: "proveedor",
          titulo: "Iberdrola",
          contenido: "luz",
          tags: ["hogar"],
          vigenteDesde: null,
          vigenteHasta: null,
          estado: "publicado",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        }}
      />,
    );
    expect(screen.getByLabelText("Título")).toHaveValue("Iberdrola");
    expect(screen.getByLabelText("Tags (separados por comas)")).toHaveValue("hogar");
  });
});
