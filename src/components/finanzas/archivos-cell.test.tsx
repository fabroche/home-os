// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const subirArchivoMovimiento = vi.fn();
const refresh = vi.fn();
vi.mock("@/lib/actions/finanzas", () => ({
  subirArchivoMovimiento: (...args: unknown[]) => subirArchivoMovimiento(...args),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { ArchivosCell } from "@/components/finanzas/archivos-cell";

beforeEach(() => {
  subirArchivoMovimiento.mockReset();
  refresh.mockReset();
});

describe("ArchivosCell", () => {
  it("muestra enlaces a la factura existente", () => {
    render(<ArchivosCell pageId="p1" facturas={["https://x/factura.pdf"]} comprobantes={[]} />);
    const link = screen.getByTitle("Factura 1");
    expect(link).toHaveAttribute("href", "https://x/factura.pdf");
  });

  it("sube un comprobante con el FormData correcto", async () => {
    subirArchivoMovimiento.mockResolvedValue({ ok: true, id: "p1" });
    const { container } = render(<ArchivosCell pageId="p1" facturas={[]} comprobantes={[]} />);

    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]');
    expect(inputs).toHaveLength(2); // factura + comprobante
    const file = new File(["data"], "pago.pdf", { type: "application/pdf" });
    fireEvent.change(inputs[1]!, { target: { files: [file] } }); // segundo = comprobante

    await waitFor(() => expect(subirArchivoMovimiento).toHaveBeenCalled());
    const fd = subirArchivoMovimiento.mock.calls[0]![0] as FormData;
    expect(fd.get("pageId")).toBe("p1");
    expect(fd.get("tipo")).toBe("comprobante");
    expect((fd.get("file") as File).name).toBe("pago.pdf");
    expect(refresh).toHaveBeenCalled();
  });

  it("muestra el error si la subida falla", async () => {
    subirArchivoMovimiento.mockResolvedValue({ ok: false, error: "Tipo inválido." });
    const { container } = render(<ArchivosCell pageId="p1" facturas={[]} comprobantes={[]} />);
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(["x"], "f.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText("Tipo inválido.")).toBeInTheDocument());
  });
});
