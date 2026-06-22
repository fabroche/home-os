// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renderiza un <button> y dispara onClick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Guardar</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("aplica la variante de marca (primary)", () => {
    render(<Button variant="primary">X</Button>);
    expect(screen.getByRole("button", { name: "X" }).className).toContain("bg-primary");
  });

  it("renderiza un enlace cuando recibe href", () => {
    render(<Button href="/finanzas">Ir</Button>);
    expect(screen.getByRole("link", { name: "Ir" })).toHaveAttribute("href", "/finanzas");
  });

  it("no dispara onClick si está disabled", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        No
      </Button>,
    );
    fireEvent.click(screen.getByRole("button", { name: "No" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
