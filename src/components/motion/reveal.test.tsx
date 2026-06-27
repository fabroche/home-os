// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { Reveal, _resetRevelados, _marcarRevelado } from "@/components/motion/reveal";

// motion usa IntersectionObserver para whileInView; jsdom no lo trae.
beforeAll(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    },
  );
});

beforeEach(() => _resetRevelados());

describe("Reveal", () => {
  it("renderiza sus hijos", () => {
    render(
      <Reveal>
        <span>contenido</span>
      </Reveal>,
    );
    expect(screen.getByText("contenido")).toBeInTheDocument();
  });

  it("respeta el tag indicado en 'as'", () => {
    render(
      <Reveal as="section">
        <span>sec</span>
      </Reveal>,
    );
    expect(screen.getByText("sec")).toBeInTheDocument();
  });

  it("la primera vez (id no revelado) arranca oculto para animar", () => {
    const { container } = render(
      <Reveal id="x">
        <span>uno</span>
      </Reveal>,
    );
    expect(container.firstChild).toHaveStyle({ opacity: "0" });
  });

  it("si el id ya se reveló en esta carga, aparece visible sin animar", () => {
    _marcarRevelado("x");
    const { container } = render(
      <Reveal id="x">
        <span>dos</span>
      </Reveal>,
    );
    expect(container.firstChild).not.toHaveStyle({ opacity: "0" });
  });
});
