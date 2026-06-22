// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { Field, Input, Select, Textarea } from "@/components/ui/input";

describe("Field", () => {
  it("asocia la etiqueta con el control vía htmlFor", () => {
    render(
      <Field label="Nombre" htmlFor="nombre">
        <Input id="nombre" />
      </Field>,
    );
    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
  });

  it("muestra el error cuando se pasa", () => {
    render(
      <Field label="Importe" htmlFor="imp" error="Obligatorio">
        <Input id="imp" />
      </Field>,
    );
    expect(screen.getByText("Obligatorio")).toBeInTheDocument();
  });

  it("no muestra error si no hay", () => {
    render(
      <Field label="X" htmlFor="x">
        <Input id="x" />
      </Field>,
    );
    expect(screen.queryByText(/obligatorio/i)).not.toBeInTheDocument();
  });

  it("Select y Textarea renderizan", () => {
    render(
      <>
        <Select aria-label="sel">
          <option>a</option>
        </Select>
        <Textarea aria-label="ta" />
      </>,
    );
    expect(screen.getByLabelText("sel")).toBeInTheDocument();
    expect(screen.getByLabelText("ta")).toBeInTheDocument();
  });
});
