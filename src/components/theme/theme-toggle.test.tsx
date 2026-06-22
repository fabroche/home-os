// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const setTheme = vi.fn();
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme }),
}));

import { ThemeToggle } from "@/components/theme/theme-toggle";

describe("ThemeToggle", () => {
  it("alterna a oscuro cuando el tema actual es claro", () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: /cambiar tema/i }));
    expect(setTheme).toHaveBeenCalledWith("dark");
  });
});
