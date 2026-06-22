// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { Card, CardTitle, CardLabel } from "@/components/ui/card";

describe("Card", () => {
  it("renderiza label, título y cuerpo", () => {
    render(
      <Card>
        <CardLabel>Ingresos</CardLabel>
        <CardTitle>Resumen</CardTitle>
        <p>cuerpo</p>
      </Card>,
    );
    expect(screen.getByText("Ingresos")).toBeInTheDocument();
    expect(screen.getByText("Resumen")).toBeInTheDocument();
    expect(screen.getByText("cuerpo")).toBeInTheDocument();
  });

  it("acepta className extra", () => {
    render(<Card className="mi-clase">x</Card>);
    expect(screen.getByText("x").className).toContain("mi-clase");
  });
});
