"use client";

import type { Movimiento } from "@/types/finanzas";
import { EstadoToggle } from "@/components/finanzas/estado-toggle";
import { ArchivosCell } from "@/components/finanzas/archivos-cell";

const eur = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

const COLOR_FLUJO: Record<string, string> = {
  ingreso: "text-income",
  gasto: "text-expense",
  deuda: "text-debt",
};

/** Tabla de movimientos con estado editable y gestión de factura/comprobante. */
export function MovimientosTable({ movimientos }: { movimientos: Movimiento[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-secondary text-left text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 font-medium">Fecha</th>
            <th className="px-4 py-2.5 font-medium">Nombre</th>
            <th className="px-4 py-2.5 font-medium">Categoría</th>
            <th className="px-4 py-2.5 font-medium">Estado</th>
            <th className="px-4 py-2.5 font-medium">Archivos</th>
            <th className="px-4 py-2.5 text-right font-medium">Importe</th>
          </tr>
        </thead>
        <tbody>
          {movimientos.map((m) => (
            <tr key={m.notionPageId} className="border-t border-border transition-colors hover:bg-accent/50">
              <td className="px-4 py-2.5 nums text-muted-foreground">{m.fecha ?? "—"}</td>
              <td className="px-4 py-2.5">{m.nombre || "—"}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{m.categoria ?? "—"}</td>
              <td className="px-4 py-2.5">
                <EstadoToggle pageId={m.notionPageId} estado={m.estado} />
              </td>
              <td className="px-4 py-2.5">
                <ArchivosCell
                  pageId={m.notionPageId}
                  facturas={m.facturas}
                  comprobantes={m.comprobantes}
                />
              </td>
              <td className={`px-4 py-2.5 text-right nums font-medium ${COLOR_FLUJO[m.flujo] ?? ""}`}>
                {m.importe != null ? eur(m.importe) : "—"}
              </td>
            </tr>
          ))}
          {movimientos.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                Sin movimientos.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
