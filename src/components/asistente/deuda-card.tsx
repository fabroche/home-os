"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { crearDeuda } from "@/lib/actions/finanzas";
import { PERSONAS_DEUDA, type CrearDeudaInput } from "@/types/finanzas";
import { cn } from "@/lib/utils";
import { Card, CardLabel } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AccionResuelta } from "@/components/asistente/chat-message";

/**
 * Tarjeta de acción del Asistente (M6 · tool calling): la IA **propone** un alta de
 * deuda o pago; el usuario lo revisa, edita y confirma. La escritura SOLO ocurre al
 * confirmar (gobernanza "propone → aprueba → crea"): confirmar llama a `crearDeuda`
 * (Server Action con auth + Zod que escribe en Notion).
 */
export function DeudaCard({
  propuesta,
  resueltoInicial,
  onResuelto,
}: {
  propuesta: CrearDeudaInput;
  /** Estado resuelto persistido (al rehidratar): si está, la card nace congelada. */
  resueltoInicial?: AccionResuelta;
  onResuelto?: (estado: AccionResuelta) => void;
}) {
  const [form, setForm] = useState<CrearDeudaInput>(propuesta);
  // Resuelto efectivo = lo decidido aquí (local) o lo persistido/superado que llega por prop.
  const [resueltoLocal, setResueltoLocal] = useState<AccionResuelta | null>(null);
  const resuelto = resueltoLocal ?? resueltoInicial ?? null;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof CrearDeudaInput>(k: K, v: CrearDeudaInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function confirmar() {
    setError(null);
    startTransition(async () => {
      const res = await crearDeuda(form);
      if (res.ok) {
        setResueltoLocal("creado");
        onResuelto?.("creado");
      } else {
        setError(res.error);
      }
    });
  }

  if (resuelto) {
    const etiqueta =
      resuelto === "creado"
        ? "Registrado"
        : resuelto === "superado"
          ? "Descartado (lo reescribiste)"
          : "Cancelado";
    return (
      <Card className="flex items-center gap-2 text-sm text-muted-foreground">
        <Check className="size-4 text-income" />
        {etiqueta}: <span className="font-medium text-foreground">{form.concepto}</span>
      </Card>
    );
  }

  const field = "mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm";
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <CardLabel>{form.movimiento === "pago" ? "Registrar pago" : "Registrar deuda"}</CardLabel>
        <Badge tone="brand">{form.persona || "—"}</Badge>
      </div>

      <div className="mt-3 space-y-2">
        <label className="block text-xs text-muted-foreground">
          Concepto
          <Input value={form.concepto} onChange={(e) => set("concepto", e.target.value)} className="mt-1 h-9" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs text-muted-foreground">
            Persona
            <input
              value={form.persona}
              onChange={(e) => set("persona", e.target.value)}
              list="personas-deuda"
              className={field}
            />
            <datalist id="personas-deuda">
              {PERSONAS_DEUDA.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </label>
          <label className="block text-xs text-muted-foreground">
            Importe (€)
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={String(form.valor)}
              onChange={(e) => set("valor", Number(e.target.value))}
              className="mt-1 h-9"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs text-muted-foreground">
            Tipo
            <select
              value={form.movimiento}
              onChange={(e) => set("movimiento", e.target.value as CrearDeudaInput["movimiento"])}
              className={cn(field, "text-foreground")}
            >
              <option value="deuda">Nueva deuda</option>
              <option value="pago">Pago</option>
            </select>
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
      </div>

      {error && <p className="mt-2 text-sm text-expense">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={pending || form.concepto.trim().length === 0 || form.persona.trim().length === 0 || !(form.valor > 0)}
          onClick={confirmar}
        >
          Confirmar y registrar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            setResueltoLocal("cancelado");
            onResuelto?.("cancelado");
          }}
        >
          Cancelar
        </Button>
      </div>
    </Card>
  );
}
