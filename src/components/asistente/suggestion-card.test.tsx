// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const guardarEntrada = vi.fn();
vi.mock("@/lib/actions/contexto", () => ({
  guardarEntrada: (...a: unknown[]) => guardarEntrada(...a),
}));

import { SuggestionCard } from "@/components/asistente/suggestion-card";

const borrador = {
  tipo: "regla_financiera" as const,
  titulo: "Mercadona = Comida",
  contenido: "Cargos de Mercadona → Comida.",
  tags: ["comida"],
};

beforeEach(() => guardarEntrada.mockReset());

describe("SuggestionCard", () => {
  it("muestra el borrador propuesto", () => {
    render(<SuggestionCard borrador={borrador} />);
    expect(screen.getByText("Mercadona = Comida")).toBeInTheDocument();
    expect(screen.getByText(/sugerencia de contexto/i)).toBeInTheDocument();
  });

  it("publica con estado publicado y confirma", async () => {
    guardarEntrada.mockResolvedValue({ ok: true, id: "e1" });
    render(<SuggestionCard borrador={borrador} />);
    fireEvent.click(screen.getByRole("button", { name: /revisar y publicar/i }));
    await waitFor(() => expect(screen.getByText(/^Publicado/)).toBeInTheDocument());
    expect(guardarEntrada).toHaveBeenCalledWith(expect.objectContaining({ estado: "publicado", titulo: "Mercadona = Comida" }));
  });

  it("guarda como borrador con estado borrador", async () => {
    guardarEntrada.mockResolvedValue({ ok: true, id: "e2" });
    render(<SuggestionCard borrador={borrador} />);
    fireEvent.click(screen.getByRole("button", { name: /guardar como borrador/i }));
    await waitFor(() => expect(screen.getByText(/guardado como borrador/i)).toBeInTheDocument());
    expect(guardarEntrada).toHaveBeenCalledWith(expect.objectContaining({ estado: "borrador" }));
  });

  it("descartar no persiste nada", () => {
    render(<SuggestionCard borrador={borrador} />);
    fireEvent.click(screen.getByRole("button", { name: /descartar/i }));
    expect(screen.getByText(/^Descartado/)).toBeInTheDocument();
    expect(guardarEntrada).not.toHaveBeenCalled();
  });
});
