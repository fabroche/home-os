// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ usePathname: () => "/finanzas" }));
// Aislamos la nav: los hijos tienen sus propias deps (tema/supabase).
vi.mock("@/components/theme/theme-toggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));
vi.mock("@/components/layout/logout-button", () => ({
  LogoutButton: () => <button type="button">Salir</button>,
}));

import { DashboardHeader } from "@/components/layout/dashboard-header";

describe("DashboardHeader", () => {
  it("muestra el logo y un enlace por sección", () => {
    render(<DashboardHeader />);
    expect(screen.getByRole("link", { name: /home·os/i })).toBeInTheDocument();
    for (const label of ["Inicio", "Finanzas", "Calendario", "Backoffice", "Contexto"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("resalta la sección activa (bg-card) frente a las inactivas", () => {
    render(<DashboardHeader />);
    expect(screen.getByRole("link", { name: "Finanzas" }).className).toContain("bg-card");
    expect(screen.getByRole("link", { name: "Inicio" }).className).toContain("text-muted-foreground");
  });
});
