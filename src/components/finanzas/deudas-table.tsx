"use client";

import { Fragment, useState } from "react";
import { Pencil } from "lucide-react";
import type { Deuda } from "@/types/finanzas";
import { BorrarButton } from "@/components/finanzas/borrar-button";
import { EditarDeuda } from "@/components/finanzas/editar-deuda";
import { cn } from "@/lib/utils";

const eur = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

/** Tabla de deudas/pagos con edición y borrado en línea (se refluye a tarjetas en móvil). */
export function DeudasTable({ deudas, personas = [] }: { deudas: Deuda[]; personas?: string[] }) {
  const [editando, setEditando] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto rounded-xl border border-border max-md:border-0">
      <table className="reflow-cards w-full text-sm">
        <thead className="bg-secondary text-left text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 font-medium">Concepto</th>
            <th className="px-4 py-2.5 font-medium">Persona</th>
            <th className="px-4 py-2.5 text-right font-medium">Movimiento</th>
            <th className="px-4 py-2.5 font-medium">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {deudas.map((d) => (
            <Fragment key={d.id}>
              <tr className="border-t border-border transition-colors hover:bg-accent/50">
                <td className="px-4 py-2.5" data-label="Concepto">
                  {d.concepto || "—"}
                </td>
                <td className="px-4 py-2.5" data-label="Persona">
                  {d.persona ?? "—"}
                </td>
                <td
                  data-label="Movimiento"
                  className={cn(
                    "px-4 py-2.5 text-right nums",
                    d.valor == null ? "" : d.valor < 0 ? "text-debt" : "text-income",
                  )}
                >
                  {d.valor != null ? eur(d.valor) : "—"}
                </td>
                <td className="px-4 py-2.5 text-right max-md:text-left" data-label="Acciones">
                  <span className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditando((id) => (id === d.id ? null : d.id))}
                      aria-label={`Editar ${d.concepto || "deuda"}`}
                      title="Editar"
                      className={cn(
                        "inline-grid size-7 place-items-center rounded-md text-muted-foreground transition-colors",
                        "hover:bg-primary/10 hover:text-primary max-md:size-9",
                        editando === d.id && "bg-primary/10 text-primary",
                      )}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <BorrarButton tipo="deuda" pageId={d.id} nombre={d.concepto || "deuda"} />
                  </span>
                </td>
              </tr>
              {editando === d.id && (
                <tr className="edit-row border-t border-border">
                  <td colSpan={4} className="edit-cell px-4 py-3">
                    <EditarDeuda deuda={d} personas={personas} onDone={() => setEditando(null)} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}

          {deudas.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                Sin deudas.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
