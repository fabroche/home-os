import { describe, it, expect } from "vitest";
import { NAV, isActiveHref } from "@/components/layout/nav-items";

describe("nav-items", () => {
  it("isActiveHref: '/' solo está activo en la ruta exacta", () => {
    expect(isActiveHref("/", "/")).toBe(true);
    expect(isActiveHref("/finanzas", "/")).toBe(false);
  });

  it("isActiveHref: el resto activa por prefijo (cubre subrutas)", () => {
    expect(isActiveHref("/finanzas", "/finanzas")).toBe(true);
    expect(isActiveHref("/finanzas/123", "/finanzas")).toBe(true);
    expect(isActiveHref("/contexto", "/finanzas")).toBe(false);
  });

  it("NAV expone las 5 secciones con href, label e icono", () => {
    expect(NAV).toHaveLength(5);
    for (const n of NAV) {
      expect(n.href).toMatch(/^\//);
      expect(n.label.length).toBeGreaterThan(0);
      expect(n.icon).toBeTruthy(); // componente de icono de lucide (forwardRef)
    }
  });
});
