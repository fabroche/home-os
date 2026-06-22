// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { BarList } from "@/components/finanzas/bar-list";

describe("BarList", () => {
  it("renderiza etiquetas y valores formateados", () => {
    render(
      <BarList
        items={[
          { label: "Casa", value: 850 },
          { label: "Comida", value: 420 },
        ]}
        format={(n) => `${n} €`}
      />,
    );
    expect(screen.getByText("Casa")).toBeInTheDocument();
    expect(screen.getByText("850 €")).toBeInTheDocument();
    expect(screen.getByText("Comida")).toBeInTheDocument();
  });

  it("muestra el estado vacío sin items", () => {
    render(<BarList items={[]} />);
    expect(screen.getByText(/sin datos/i)).toBeInTheDocument();
  });
});
