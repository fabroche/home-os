// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";

// Con reduced-motion el componente renderiza el valor estático ya formateado
// (determinista, sin depender de la animación de react-countup).
vi.mock("motion/react", () => ({ useReducedMotion: () => true }));

import { AnimatedNumber } from "@/components/ui/count-up";

describe("AnimatedNumber", () => {
  it("formatea como divisa (EUR, es-ES)", () => {
    render(<AnimatedNumber value={4280.5} currency="EUR" />);
    // Robusto ante el separador de miles / símbolo del ICU; comprueba los decimales.
    expect(screen.getByText(/280,50/)).toBeInTheDocument();
  });

  it("formatea entero sin decimales", () => {
    render(<AnimatedNumber value={128} />);
    expect(screen.getByText("128")).toBeInTheDocument();
  });
});
