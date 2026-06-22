// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ usePathname: () => "/finanzas" }));

import { MobileNav } from "@/components/layout/mobile-nav";

describe("MobileNav", () => {
  it("renderiza un enlace por sección con su etiqueta", () => {
    render(<MobileNav />);
    for (const label of ["Inicio", "Finanzas", "Calendario", "Backoffice", "Contexto"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("marca la sección activa con aria-current y no las demás", () => {
    render(<MobileNav />);
    expect(screen.getByRole("link", { name: "Finanzas" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Inicio" })).not.toHaveAttribute("aria-current");
  });
});
