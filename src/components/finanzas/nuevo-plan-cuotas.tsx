"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { crearPlanCuotas } from "@/lib/actions/cuotas";
import { CATEGORIAS, TIPOS } from "@/types/finanzas";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Field } from "@/components/ui/input";

const TIPOS_GASTO = TIPOS.filter((t) => t.startsWith("Gasto"));
const SIN = "__sin__";

function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Alta de un gasto a plazos. La cuota 1 se genera al crear; el resto las genera el worker
 * cada mes el día de facturación. Normalmente va sobre una tarjeta de crédito.
 */
export function NuevoPlanCuotas({
  tarjetas = [],
  personas = [],
}: {
  tarjetas?: { id: string; nombre: string }[];
  personas?: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const [concepto, setConcepto] = useState("");
  const [montoTotal, setMontoTotal] = useState("");
  const [numCuotas, setNumCuotas] = useState("10");
  const [categoria, setCategoria] = useState<(typeof CATEGORIAS)[number]>("Confort");
  const [tipo, setTipo] = useState<string>("Gasto Fijo");
  const [fechaInicio, setFechaInicio] = useState(hoy());
  const [diaFacturacion, setDiaFacturacion] = useState("1");
  const [tarjetaId, setTarjetaId] = useState<string>(SIN);
  const [persona, setPersona] = useState("");

  const cuota =
    Number(montoTotal) > 0 && Number(numCuotas) >= 2
      ? Math.round((Number(montoTotal) / Number(numCuotas)) * 100) / 100
      : 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const res = await crearPlanCuotas({
        concepto,
        montoTotal: Number(montoTotal),
        numCuotas: Number(numCuotas),
        categoria,
        tipo,
        fechaInicio,
        diaFacturacion: Number(diaFacturacion) || 1,
        tarjetaId: tarjetaId === SIN ? null : tarjetaId,
        persona: persona.trim() || null,
      });
      if (res.ok) {
        setConcepto("");
        setMontoTotal("");
        setNumCuotas("10");
        setTarjetaId(SIN);
        setPersona("");
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
      <Button size="sm" variant="soft" className="max-sm:h-11 max-sm:px-5" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Gasto a plazos
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
        Nuevo <span className="serif-accent text-primary">gasto a plazos</span>
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        La cuota 1 se crea ahora; el resto, cada mes el día de facturación.
        {cuota > 0 && ` ≈ ${cuota.toFixed(2)} €/mes.`}
      </p>

      <form onSubmit={submit} className="mt-4 space-y-4">
        <Field label="Concepto" htmlFor="plan-concepto" error={errors.concepto}>
          <Input
            id="plan-concepto"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Portátil, móvil…"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Total (€)" htmlFor="plan-total" error={errors.montoTotal}>
            <Input
              id="plan-total"
              type="number"
              step="0.01"
              min="0"
              value={montoTotal}
              onChange={(e) => setMontoTotal(e.target.value)}
              placeholder="1000"
            />
          </Field>
          <Field label="Nº de cuotas" htmlFor="plan-cuotas" error={errors.numCuotas}>
            <Input
              id="plan-cuotas"
              type="number"
              min="2"
              max="120"
              value={numCuotas}
              onChange={(e) => setNumCuotas(e.target.value)}
            />
          </Field>
          <Field label="Categoría" htmlFor="plan-categoria">
            <Select
              id="plan-categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as typeof categoria)}
            >
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tipo" htmlFor="plan-tipo">
            <Select id="plan-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS_GASTO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Primera cuota" htmlFor="plan-fecha" error={errors.fechaInicio}>
            <Input
              id="plan-fecha"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </Field>
          <Field label="Día de facturación" htmlFor="plan-dia" error={errors.diaFacturacion}>
            <Input
              id="plan-dia"
              type="number"
              min="1"
              max="28"
              value={diaFacturacion}
              onChange={(e) => setDiaFacturacion(e.target.value)}
            />
          </Field>
          <Field label="Tarjeta" htmlFor="plan-tarjeta">
            <Select id="plan-tarjeta" value={tarjetaId} onChange={(e) => setTarjetaId(e.target.value)}>
              <option value={SIN}>— Sin tarjeta —</option>
              {tarjetas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Persona" htmlFor="plan-persona">
            <Input
              id="plan-persona"
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              list="personas-plan"
              placeholder="¿De quién? (opcional)"
            />
            <datalist id="personas-plan">
              {personas.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </Field>
        </div>

        {formError && <p className="text-sm text-expense">{formError}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Creando…" : "Crear plan"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
