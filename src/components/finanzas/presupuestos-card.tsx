"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { guardarPresupuesto, borrarPresupuesto } from "@/lib/actions/presupuestos";
import type { PresupuestoItem } from "@/lib/finanzas/aggregations";
import { Button } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const eur = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

/**
 * Tarjeta de presupuestos: por cada tope de categoría muestra gastado/tope y una barra de
 * progreso del mes en curso (violeta → ámbar ≥80% → rojo si se excede). Form inline para fijar
 * un tope (upsert por categoría) y borrado por ítem. Todo vía Server Actions + refresh.
 */
export function PresupuestosCard({
  items,
  categorias,
  mesLabel,
}: {
  items: PresupuestoItem[];
  categorias: readonly string[];
  mesLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [categoria, setCategoria] = useState<string>(categorias[0] ?? "");
  const [monto, setMonto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await guardarPresupuesto({ categoria, monto: Number(monto) });
      if (res.ok) {
        setMonto("");
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function eliminar(id: string) {
    startTransition(async () => {
      const res = await borrarPresupuesto(id);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <CardLabel className="capitalize">Presupuestos · {mesLabel}</CardLabel>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
        >
          {open ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
          {open ? "Cerrar" : "Presupuesto"}
        </button>
      </div>

      {open && (
        <form onSubmit={guardar} className="mb-4 flex flex-wrap items-end gap-2">
          <Select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            aria-label="Categoría"
            className="h-9 w-auto flex-1 py-1.5"
          >
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="Tope €/mes"
            aria-label="Tope mensual"
            className="h-9 w-28 py-1.5"
          />
          <Button type="submit" size="sm" disabled={pending} className="h-9">
            {pending ? "…" : "Guardar"}
          </Button>
          {error && <p className="w-full text-sm text-expense">{error}</p>}
        </form>
      )}

      {items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((it) => (
            <li key={it.id}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium">{it.categoria}</span>
                <span className="inline-flex items-center gap-2">
                  <span className="nums text-muted-foreground">
                    {eur(it.gastado)} / {eur(it.tope)}
                  </span>
                  <span className={cn("nums font-medium", it.excedido ? "text-expense" : "text-muted-foreground")}>
                    {it.pct}%
                  </span>
                  <button
                    type="button"
                    onClick={() => eliminar(it.id)}
                    aria-label={`Borrar presupuesto de ${it.categoria}`}
                    title="Borrar"
                    className="text-muted-foreground transition-colors hover:text-expense"
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    it.excedido ? "bg-expense" : it.pct >= 80 ? "bg-debt" : "bg-primary",
                  )}
                  style={{ width: `${Math.min(it.pct, 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Aún no tienes presupuestos. Fija un tope por categoría para seguir tu gasto del mes.
        </p>
      )}
    </Card>
  );
}
