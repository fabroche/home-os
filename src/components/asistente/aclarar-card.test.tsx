// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { AclararCard } from "@/components/asistente/aclarar-card";

const aclarar = {
  pregunta: "¿Registrar un gasto nuevo o marcar uno como pagado?",
  opciones: [
    { etiqueta: "Registrar gasto nuevo", accion: "gasto" as const },
    { etiqueta: "Marcar como pagado", accion: "pagado" as const },
  ],
  mensaje: "ya pagué la luz",
};

describe("AclararCard", () => {
  it("muestra la pregunta y las opciones", () => {
    render(<AclararCard aclarar={aclarar} />);
    expect(screen.getByText(/gasto nuevo o marcar/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /registrar gasto nuevo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /marcar como pagado/i })).toBeInTheDocument();
  });

  it("al elegir una opción llama onElegir con el mensaje original y la acción", () => {
    const onElegir = vi.fn();
    render(<AclararCard aclarar={aclarar} onElegir={onElegir} />);
    fireEvent.click(screen.getByRole("button", { name: /marcar como pagado/i }));
    expect(onElegir).toHaveBeenCalledWith("ya pagué la luz", "pagado");
    // Tras elegir, la tarjeta se colapsa al estado resuelto.
    expect(screen.getByText(/has elegido/i)).toBeInTheDocument();
  });
});
