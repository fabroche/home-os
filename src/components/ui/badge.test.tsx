// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";

describe("Badge", () => {
  it("renderiza el contenido", () => {
    render(<Badge>Publicado</Badge>);
    expect(screen.getByText("Publicado")).toBeInTheDocument();
  });

  it("aplica el tono de marca", () => {
    render(<Badge tone="brand">Marca</Badge>);
    expect(screen.getByText("Marca").className).toContain("text-primary");
  });
});
