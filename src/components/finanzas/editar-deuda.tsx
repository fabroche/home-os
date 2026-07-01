"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editarDeuda } from "@/lib/actions/finanzas";
import type { Deuda } from "@/types/finanzas";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";

const NUEVA = "__nueva__";

/**
 * Formulario de edición de una deuda/pago existente. Se muestra en línea desde la tabla de
 * deudas. El valor guardado va firmado (deuda negativa, pago positivo): aquí se descompone en
 * magnitud + tipo para editarlo, y el servidor lo vuelve a firmar.
 */
export function EditarDeuda({
  deuda,
  personas = [],
  onDone,
}: {
  deuda: Deuda;
  personas?: string[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const esPago = (deuda.valor ?? 0) > 0;
  const personaConocida = deuda.persona ? personas.includes(deuda.persona) : false;

  const [concepto, setConcepto] = useState(deuda.concepto ?? "");
  const [persona, setPersona] = useState<string>(
    deuda.persona && personaConocida ? deuda.persona : NUEVA,
  );
  const [nuevaPersona, setNuevaPersona] = useState(personaConocida ? "" : (deuda.persona ?? ""));
  const [valor, setValor] = useState(
    deuda.valor != null ? String(Math.abs(deuda.valor)) : "",
  );
  const [movimiento, setMovimiento] = useState<"deuda" | "pago">(esPago ? "pago" : "deuda");
  const [fecha, setFecha] = useState(deuda.fechaCreacion ?? "");

  const creandoNueva = persona === NUEVA;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    const personaFinal = creandoNueva ? nuevaPersona.trim() : persona;
    startTransition(async () => {
      const res = await editarDeuda({
        id: deuda.id,
        concepto,
        persona: personaFinal,
        valor: Number(valor),
        movimiento,
        fecha,
      });
      if (res.ok) {
        onDone?.();
        router.refresh();
      } else {
        setFormError(res.error);
        if (res.fieldErrors) setErrors(res.fieldErrors);
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <h3 className="text-sm font-semibold">
        Editar <span className="serif-accent text-primary">deuda o pago</span>
      </h3>

      <form onSubmit={submit} className="mt-3 space-y-4">
        <Field label="Concepto" htmlFor={`ed-concepto-${deuda.id}`} error={errors.concepto}>
          <Input
            id={`ed-concepto-${deuda.id}`}
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Préstamo, pago mensual…"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo" htmlFor={`ed-mov-${deuda.id}`}>
            <Select
              id={`ed-mov-${deuda.id}`}
              value={movimiento}
              onChange={(e) => setMovimiento(e.target.value as "deuda" | "pago")}
            >
              <option value="deuda">Deuda (resta)</option>
              <option value="pago">Pago (suma)</option>
            </Select>
          </Field>
          <Field label="Persona" htmlFor={`ed-persona-deuda-${deuda.id}`} error={errors.persona}>
            <Select
              id={`ed-persona-deuda-${deuda.id}`}
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
            >
              {personas.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
              <option value={NUEVA}>➕ Otra persona…</option>
            </Select>
            {creandoNueva && (
              <Input
                aria-label="Nueva persona"
                value={nuevaPersona}
                onChange={(e) => setNuevaPersona(e.target.value)}
                placeholder="Nombre de la persona"
                className="mt-2"
              />
            )}
          </Field>
          <Field label="Valor (€)" htmlFor={`ed-valor-${deuda.id}`} error={errors.valor}>
            <Input
              id={`ed-valor-${deuda.id}`}
              type="number"
              step="0.01"
              min="0"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
            />
          </Field>
          <Field label="Fecha" htmlFor={`ed-fecha-deuda-${deuda.id}`} error={errors.fecha}>
            <Input
              id={`ed-fecha-deuda-${deuda.id}`}
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </Field>
        </div>

        {formError && <p className="text-sm text-expense">{formError}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onDone?.()}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
