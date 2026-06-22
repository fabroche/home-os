// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ChatPanel monta SuggestionCard, que importa una Server Action: se mockea.
vi.mock("@/lib/actions/contexto", () => ({ guardarEntrada: vi.fn() }));

import { ChatPanel } from "@/components/asistente/chat-panel";

describe("ChatPanel", () => {
  it("muestra el estado vacío", () => {
    render(<ChatPanel messages={[]} pending={false} onSend={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/preguntá sobre tus finanzas/i)).toBeInTheDocument();
  });

  it("envía el texto y limpia el input", () => {
    const onSend = vi.fn();
    render(<ChatPanel messages={[]} pending={false} onSend={onSend} onClose={vi.fn()} />);
    const input = screen.getByLabelText("Mensaje para el asistente");
    fireEvent.change(input, { target: { value: "  hola  " } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(onSend).toHaveBeenCalledWith("hola");
    expect((input as HTMLInputElement).value).toBe("");
  });

  it("no envía si está pending", () => {
    const onSend = vi.fn();
    render(<ChatPanel messages={[]} pending onSend={onSend} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Mensaje para el asistente"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(onSend).not.toHaveBeenCalled();
  });

  it("cierra con la X", () => {
    const onClose = vi.fn();
    render(<ChatPanel messages={[]} pending={false} onSend={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onClose).toHaveBeenCalled();
  });
});
