import { describe, it, expect } from "vitest";
import {
  writeTitle,
  writeNumber,
  writeSelect,
  writeStatus,
  writeDate,
  writeFiles,
} from "@/lib/notion/properties-write";

describe("escritores de propiedades de Notion", () => {
  it("writeTitle", () => {
    expect(writeTitle("Hola")).toEqual({ title: [{ type: "text", text: { content: "Hola" } }] });
  });
  it("writeNumber acepta valor y null", () => {
    expect(writeNumber(-450)).toEqual({ number: -450 });
    expect(writeNumber(null)).toEqual({ number: null });
  });
  it("writeSelect mapea nombre o null", () => {
    expect(writeSelect("Casa")).toEqual({ select: { name: "Casa" } });
    expect(writeSelect(null)).toEqual({ select: null });
  });
  it("writeStatus", () => {
    expect(writeStatus("Done")).toEqual({ status: { name: "Done" } });
  });
  it("writeDate acepta fecha o null", () => {
    expect(writeDate("2026-06-01")).toEqual({ date: { start: "2026-06-01" } });
    expect(writeDate(null)).toEqual({ date: null });
  });
  it("writeFiles construye enlaces externos con nombre derivado", () => {
    const r = writeFiles([{ url: "https://x/y/factura.pdf" }]);
    expect(r).toEqual({
      files: [
        { type: "external", name: "factura.pdf", external: { url: "https://x/y/factura.pdf" } },
      ],
    });
  });
});
