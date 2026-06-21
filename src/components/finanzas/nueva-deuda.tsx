"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { PERSONAS_DEUDA } from "@/types/finanzas";
import { crearDeuda } from "@/lib/actions/finanzas";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Field } from "@/components/ui/input";

function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Alta de un movimiento de deuda (deuda negativa / pago positivo) en Notion. */
export function NuevaDeuda() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const [concepto, setConcepto] = useState("");
  const [persona, setPersona] = useState<string>(PERSONAS_DEUDA[0]);
  const [valor, setValor] = useState("");
  const [movimiento, setMovimiento] = useState<"deuda" | "pago">("deuda");
  const [fecha, setFecha] = useState(hoy());

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const res = await crearDeuda({
        concepto,
        persona,
        valor: Number(valor),
        movimiento,
        fecha,
      });
      if (res.ok) {
        setConcepto("");
        setValor("");
        setOpen(false);
        router.refresh();
      } else {
        setFormError(res.error);
        if (res.fieldErrors) setErrors(res.fieldErrors);
      }
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Deuda / pago
      </Button>
    );
  }

  return (
    <Card className="relative">
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Cerrar"
        className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="size-5" />
      </button>
      <h3 className="font-semibold">
        Nueva <span className="serif-accent text-primary">deuda o pago</span>
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Una <strong>deuda</strong> resta del saldo; un <strong>pago</strong> lo descuenta. Importe en positivo.
      </p>

      <form onSubmit={submit} className="mt-4 space-y-4">
        <Field label="Concepto" htmlFor="concepto" error={errors.concepto}>
          <Input
            id="concepto"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Préstamo, pago mensual…"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo" htmlFor="movimiento">
            <Select
              id="movimiento"
              value={movimiento}
              onChange={(e) => setMovimiento(e.target.value as "deuda" | "pago")}
            >
              <option value="deuda">Deuda (resta)</option>
              <option value="pago">Pago (suma)</option>
            </Select>
          </Field>
          <Field label="Persona" htmlFor="persona" error={errors.persona}>
            <Input
              id="persona"
              list="personas-deuda"
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              placeholder="Persona"
            />
            <datalist id="personas-deuda">
              {PERSONAS_DEUDA.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </Field>
          <Field label="Valor (€)" htmlFor="valor" error={errors.valor}>
            <Input
              id="valor"
              type="number"
              step="0.01"
              min="0"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
            />
          </Field>
          <Field label="Fecha" htmlFor="fecha-deuda" error={errors.fecha}>
            <Input id="fecha-deuda" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </Field>
        </div>

        {formError && <p className="text-sm text-expense">{formError}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Guardando…" : "Registrar"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
