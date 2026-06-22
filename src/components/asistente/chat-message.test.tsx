// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { ChatMessage } from "@/components/asistente/chat-message";

describe("ChatMessage", () => {
  it("muestra el contenido del usuario", () => {
    render(<ChatMessage msg={{ id: "1", rol: "user", contenido: "Hola" }} />);
    expect(screen.getByText("Hola")).toBeInTheDocument();
  });

  it("muestra la respuesta de la IA con sus fuentes", () => {
    render(
      <ChatMessage
        msg={{ id: "2", rol: "assistant", contenido: "420 €", fuentes: [{ id: "c1", titulo: "12 movimientos" }] }}
      />,
    );
    expect(screen.getByText("420 €")).toBeInTheDocument();
    expect(screen.getByText(/12 movimientos/)).toBeInTheDocument();
  });

  it("muestra el estado pensando", () => {
    render(<ChatMessage msg={{ id: "3", rol: "assistant", contenido: "", pendiente: true }} />);
    expect(screen.getByText(/pensando/i)).toBeInTheDocument();
  });
});
