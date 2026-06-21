// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { EntradaContexto } from "@/types/contexto";

// Mock de las Server Actions (evita server-only en el test).
vi.mock("@/lib/actions/contexto", () => ({
  guardarEntrada: vi.fn(),
  cambiarEstado: vi.fn(),
  eliminarEntrada: vi.fn(),
}));

import { ListaContexto } from "@/components/contexto/lista-contexto";

const entrada = (over: Partial<EntradaContexto>): EntradaContexto => ({
  id: crypto.randomUUID(),
  tipo: "regla_financiera",
  titulo: "Título",
  contenido: "Contenido",
  tags: [],
  vigenteDesde: null,
  vigenteHasta: null,
  estado: "borrador",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...over,
});

describe("ListaContexto", () => {
  it("muestra mensaje vacío cuando no hay entradas", () => {
    render(<ListaContexto entradas={[]} />);
    expect(screen.getByText(/Aún no hay entradas/i)).toBeInTheDocument();
  });

  it("filtra por texto de búsqueda", () => {
    render(
      <ListaContexto
        entradas={[
          entrada({ titulo: "Mercadona", contenido: "comida" }),
          entrada({ titulo: "Iberdrola", contenido: "luz" }),
        ]}
      />,
    );
    expect(screen.getByText("Mercadona")).toBeInTheDocument();
    expect(screen.getByText("Iberdrola")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Buscar…"), { target: { value: "merca" } });
    expect(screen.getByText("Mercadona")).toBeInTheDocument();
    expect(screen.queryByText("Iberdrola")).not.toBeInTheDocument();
  });

  it("filtra por estado", () => {
    render(
      <ListaContexto
        entradas={[
          entrada({ titulo: "Pub", estado: "publicado" }),
          entrada({ titulo: "Bor", estado: "borrador" }),
        ]}
      />,
    );
    fireEvent.change(screen.getByLabelText("Filtrar por estado"), {
      target: { value: "publicado" },
    });
    expect(screen.getByText("Pub")).toBeInTheDocument();
    expect(screen.queryByText("Bor")).not.toBeInTheDocument();
  });

  it("abre el editor al pulsar 'Nueva entrada'", () => {
    render(<ListaContexto entradas={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /Nueva entrada/i }));
    expect(screen.getByLabelText("Título")).toBeInTheDocument();
  });
});
