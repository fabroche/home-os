// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const preguntar = vi.fn();
const consultar = vi.fn();
vi.mock("@/lib/actions/ai", () => ({
  preguntarAsistente: (...a: unknown[]) => preguntar(...a),
  consultarJob: (...a: unknown[]) => consultar(...a),
}));

import { ChatBubble } from "@/components/asistente/chat-bubble";

beforeEach(() => {
  preguntar.mockReset();
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

  it("muestra el error si el job falla", async () => {
    preguntar.mockResolvedValue({ ok: true, jobId: "j2" });
    consultar.mockResolvedValue({ estado: "error", error: "salida no válida" });

    render(<ChatBubble defaultOpen pollMs={5} />);
    fireEvent.change(screen.getByLabelText("Mensaje para el asistente"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() => expect(screen.getByText(/no pude responder/i)).toBeInTheDocument());
  });
});
