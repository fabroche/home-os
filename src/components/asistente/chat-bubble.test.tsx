// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const preguntar = vi.fn();
const proponer = vi.fn();
const consultar = vi.fn();
vi.mock("@/lib/actions/ai", () => ({
  preguntarAsistente: (...a: unknown[]) => preguntar(...a),
  proponerContexto: (...a: unknown[]) => proponer(...a),
  consultarJob: (...a: unknown[]) => consultar(...a),
}));
// SuggestionCard (vía ChatPanel) importa esta Server Action.
vi.mock("@/lib/actions/contexto", () => ({ guardarEntrada: vi.fn() }));

import { ChatBubble } from "@/components/asistente/chat-bubble";

beforeEach(() => {
  preguntar.mockReset();
  proponer.mockReset();
  consultar.mockReset();
});

describe("ChatBubble", () => {
  it("abre el panel desde el FAB", () => {
    render(<ChatBubble />);
    fireEvent.click(screen.getByRole("button", { name: /abrir asistente/i }));
    expect(screen.getByLabelText("Mensaje para el asistente")).toBeInTheDocument();
  });

  it("encola la pregunta, sondea y muestra la respuesta con fuentes", async () => {
    preguntar.mockResolvedValue({ ok: true, jobId: "j1" });
    consultar.mockResolvedValue({
      estado: "ok",
      respuesta: "En mayo gastaste 420 €.",
      fuentes: [{ id: "c1", titulo: "12 movimientos" }],
    });

    render(<ChatBubble defaultOpen pollMs={5} />);
    fireEvent.change(screen.getByLabelText("Mensaje para el asistente"), {
      target: { value: "¿gasto de mayo?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(screen.getByText("¿gasto de mayo?")).toBeInTheDocument(); // mensaje optimista
    await waitFor(() => expect(screen.getByText("En mayo gastaste 420 €.")).toBeInTheDocument());
    expect(screen.getByText(/12 movimientos/)).toBeInTheDocument();
    expect(preguntar).toHaveBeenCalledWith({ pregunta: "¿gasto de mayo?" });
  });

  it("intención de enseñar: propone y muestra la tarjeta de sugerencia", async () => {
    proponer.mockResolvedValue({ ok: true, jobId: "j3" });
    consultar.mockResolvedValue({
      estado: "ok",
      tipo: "proponer_contexto",
      borradores: [
        { tipo: "proveedor", titulo: "Naturgy", contenido: "Compañía de gas", tags: ["gas"] },
      ],
    });

    render(<ChatBubble defaultOpen pollMs={5} />);
    fireEvent.change(screen.getByLabelText("Mensaje para el asistente"), {
      target: { value: "recuérdame que Naturgy es mi proveedor de gas" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() => expect(screen.getByText(/sugerencia de contexto/i)).toBeInTheDocument());
    expect(screen.getByText("Naturgy")).toBeInTheDocument();
    expect(proponer).toHaveBeenCalled();
    expect(preguntar).not.toHaveBeenCalled();
  });

  it("muestra el error si el job falla", async () => {
    preguntar.mockResolvedValue({ ok: true, jobId: "j2" });
    consultar.mockResolvedValue({ estado: "error", error: "salida no válida" });

    render(<ChatBubble defaultOpen pollMs={5} />);
    fireEvent.change(screen.getByLabelText("Mensaje para el asistente"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() => expect(screen.getByText(/no pude responder/i)).toBeInTheDocument());
  });
});
