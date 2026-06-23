"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { crearMovimiento } from "@/lib/actions/finanzas";
import { CATEGORIAS, TIPOS, type CrearMovimientoInput } from "@/types/finanzas";
import { cn } from "@/lib/utils";
import { Card, CardLabel } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Resuelto = "creado" | "cancelado";

/** Tipos de gasto (la acción registra gastos; deja fuera Ingreso/Deuda). */
const TIPOS_GASTO = TIPOS.filter((t) => t.startsWith("Gasto"));

/**
 * Tarjeta de acción del Asistente (M6 · tool calling). La IA **propone** un gasto;
 * el usuario lo **revisa, edita y confirma**. La escritura SOLO ocurre al confirmar
 * (gobernanza "propone → aprueba → crea"): la IA nunca ejecuta. Confirmar llama a
 * `crearMovimiento` (Server Action con auth + validación Zod que escribe en Notion).
 */
export function ActionCard({
  propuesta,
  onResuelto,
}: {
  propuesta: CrearMovimientoInput;
  onResuelto?: (estado: Resuelto) => void;
}) {
  const [form, setForm] = useState<CrearMovimientoInput>(propuesta);
  const [resuelto, setResuelto] = useState<Resuelto | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof CrearMovimientoInput>(k: K, v: CrearMovimientoInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function confirmar() {
    setError(null);
    startTransition(async () => {
      const res = await crearMovimiento(form);
      if (res.ok) {
        setResuelto("creado");
        onResuelto?.("creado");
      } else {
        setError(res.error);
      }
    });
  }

  if (resuelto) {
    return (
      <Card className="flex items-center gap-2 text-sm text-muted-foreground">
        <Check className="size-4 text-income" />
        {resuelto === "creado" ? "Gasto creado" : "Cancelado"}:{" "}
        <span className="font-medium text-foreground">{form.nombre}</span>
      </Card>
    );
  }

  const field = "mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm";
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <CardLabel>Registrar gasto</CardLabel>
        <Badge tone="brand">{form.categoria}</Badge>
      </div>

      <div className="mt-3 space-y-2">
        <label className="block text-xs text-muted-foreground">
          Concepto
          <Input
            value={form.nombre}
            onChange={(e) => set("nombre", e.target.value)}
            className="mt-1 h-9"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs text-muted-foreground">
            Importe (€)
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={String(form.importe)}
              onChange={(e) => set("importe", Number(e.target.value))}
              className="mt-1 h-9"
            />
          </label>
          <label className="block text-xs text-muted-foreground">
            Fecha
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => set("fecha", e.target.value)}
              className={field}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs text-muted-foreground">
            Categoría
            <select
              value={form.categoria}
              onChange={(e) => set("categoria", e.target.value as CrearMovimientoInput["categoria"])}
              className={cn(field, "text-foreground")}
            >
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-muted-foreground">
            Tipo
            <select
              value={form.tipo}
              onChange={(e) => set("tipo", e.target.value as CrearMovimientoInput["tipo"])}
              className={cn(field, "text-foreground")}
            >
              {TIPOS_GASTO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-expense">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={pending || form.nombre.trim().length === 0 || !(form.importe > 0)}
          onClick={confirmar}
        >
          Confirmar y crear
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            setResuelto("cancelado");
            onResuelto?.("cancelado");
          }}
        >
          Cancelar
        </Button>
      </div>
    </Card>
  );
}
