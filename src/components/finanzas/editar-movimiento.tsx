"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIAS, TIPOS, ESTADOS, type Movimiento } from "@/types/finanzas";
import { editarMovimiento } from "@/lib/actions/finanzas";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";

const SIN = "__sin__";

/** Tipo inicial válido (los Select solo listan TIPOS); si el guardado no está, respeta el flujo. */
function tipoInicial(m: Movimiento): (typeof TIPOS)[number] {
  if (m.tipo && (TIPOS as readonly string[]).includes(m.tipo)) return m.tipo as (typeof TIPOS)[number];
  if (m.flujo === "ingreso") return "Ingreso Variable";
  if (m.flujo === "deuda") return "Deuda";
  return "Gasto Variable";
}

/**
 * Formulario de edición de un movimiento (gasto/ingreso), nativo en Supabase. Se muestra
 * en línea desde la tabla (la fila se expande). Prefill desde el movimiento; el importe se
 * edita en positivo y el signo se re-aplica según el tipo en el servidor.
 */
export function EditarMovimiento({
  movimiento,
  cuentas = [],
  tarjetas = [],
  personas = [],
  onDone,
}: {
  movimiento: Movimiento;
  cuentas?: { id: string; nombre: string }[];
  tarjetas?: { id: string; nombre: string }[];
  personas?: string[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const [nombre, setNombre] = useState(movimiento.nombre ?? "");
  const [importe, setImporte] = useState(
    movimiento.importe != null ? String(Math.abs(movimiento.importe)) : "",
  );
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>(tipoInicial(movimiento));
  const [categoria, setCategoria] = useState<(typeof CATEGORIAS)[number]>(
    movimiento.categoria && (CATEGORIAS as readonly string[]).includes(movimiento.categoria)
      ? (movimiento.categoria as (typeof CATEGORIAS)[number])
      : "Casa",
  );
  const [fecha, setFecha] = useState(movimiento.fecha ?? "");
  const [estado, setEstado] = useState<(typeof ESTADOS)[number]>(
    movimiento.estado === "Done" ? "Done" : "Pending",
  );
  const [cuentaId, setCuentaId] = useState<string>(movimiento.cuentaId ?? SIN);
  const [tarjetaId, setTarjetaId] = useState<string>(movimiento.tarjetaId ?? SIN);
  const [persona, setPersona] = useState(movimiento.persona ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const res = await editarMovimiento({
        id: movimiento.id,
        nombre,
        importe: Number(importe),
        tipo,
        categoria,
        fecha,
        estado,
        cuentaId: cuentaId === SIN ? null : cuentaId,
        tarjetaId: tarjetaId === SIN ? null : tarjetaId,
        persona: persona.trim() || null,
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
        Editar <span className="serif-accent text-primary">movimiento</span>
      </h3>

      <form onSubmit={submit} className="mt-3 space-y-4">
        <Field label="Nombre" htmlFor={`ed-nombre-${movimiento.id}`} error={errors.nombre}>
          <Input
            id={`ed-nombre-${movimiento.id}`}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Alquiler, Mercadona…"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Importe (€)" htmlFor={`ed-importe-${movimiento.id}`} error={errors.importe}>
            <Input
              id={`ed-importe-${movimiento.id}`}
              type="number"
              step="0.01"
              min="0"
              value={importe}
              onChange={(e) => setImporte(e.target.value)}
              placeholder="0,00"
            />
          </Field>
          <Field label="Fecha" htmlFor={`ed-fecha-${movimiento.id}`} error={errors.fecha}>
            <Input
              id={`ed-fecha-${movimiento.id}`}
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </Field>
          <Field label="Tipo" htmlFor={`ed-tipo-${movimiento.id}`}>
            <Select
              id={`ed-tipo-${movimiento.id}`}
              value={tipo}
              onChange={(e) => setTipo(e.target.value as typeof tipo)}
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Categoría" htmlFor={`ed-categoria-${movimiento.id}`}>
            <Select
              id={`ed-categoria-${movimiento.id}`}
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
          <Field label="Estado" htmlFor={`ed-estado-${movimiento.id}`}>
            <Select
              id={`ed-estado-${movimiento.id}`}
              value={estado}
              onChange={(e) => setEstado(e.target.value as typeof estado)}
            >
              {ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {s === "Done" ? "Pagado" : "Pendiente"}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cuenta" htmlFor={`ed-cuenta-${movimiento.id}`}>
            <Select
              id={`ed-cuenta-${movimiento.id}`}
              value={cuentaId}
              onChange={(e) => setCuentaId(e.target.value)}
            >
              <option value={SIN}>— Sin cuenta —</option>
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tarjeta" htmlFor={`ed-tarjeta-${movimiento.id}`}>
            <Select
              id={`ed-tarjeta-${movimiento.id}`}
              value={tarjetaId}
              onChange={(e) => setTarjetaId(e.target.value)}
            >
              <option value={SIN}>— Sin tarjeta —</option>
              {tarjetas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Persona" htmlFor={`ed-persona-${movimiento.id}`}>
            <Input
              id={`ed-persona-${movimiento.id}`}
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              list={`ed-personas-${movimiento.id}`}
              placeholder="¿De quién fue? (opcional)"
            />
            <datalist id={`ed-personas-${movimiento.id}`}>
              {personas.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
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
