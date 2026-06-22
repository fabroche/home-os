// @vitest-environment jsdom
import { describe, it, expect, beforeAll, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { Reveal } from "@/components/motion/reveal";

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
});
