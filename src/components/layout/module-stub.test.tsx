// @vitest-environment jsdom
import { describe, it, expect, beforeAll, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { ModuleStub } from "@/components/layout/module-stub";

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

describe("ModuleStub", () => {
  it("muestra módulo, título, acento y descripción", () => {
    render(
      <ModuleStub modulo="M2" titulo="Calendario" accent="inteligente">
        Próximamente.
      </ModuleStub>,
    );
    expect(screen.getByText(/M2/)).toBeInTheDocument();
    expect(screen.getByText(/Calendario/)).toBeInTheDocument();
    expect(screen.getByText("inteligente")).toBeInTheDocument();
    expect(screen.getByText("Próximamente.")).toBeInTheDocument();
  });
});
