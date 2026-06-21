"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { CATEGORIAS, TIPOS, ESTADOS } from "@/types/finanzas";
import { crearMovimiento } from "@/lib/actions/finanzas";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Field } from "@/components/ui/input";

function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Alta de un movimiento (gasto/ingreso) que se escribe en Notion. */
export function NuevoMovimiento() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [importe, setImporte] = useState("");
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>("Gasto Variable");
  const [categoria, setCategoria] = useState<(typeof CATEGORIAS)[number]>("Casa");
  const [fecha, setFecha] = useState(hoy());
  const [estado, setEstado] = useState<(typeof ESTADOS)[number]>("Pending");

  function reset() {
    setNombre("");
    setImporte("");
    setErrors({});
    setFormError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const res = await crearMovimiento({
        nombre,
        importe: Number(importe),
        tipo,
        categoria,
        fecha,
        estado,
      });
      if (res.ok) {
        reset();
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
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Nuevo movimiento
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
        Nuevo <span className="serif-accent text-primary">movimiento</span>
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        El importe se introduce en positivo; el signo se aplica según el tipo.
      </p>

      <form onSubmit={submit} className="mt-4 space-y-4">
        <Field label="Nombre" htmlFor="nombre" error={errors.nombre}>
          <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Alquiler, Mercadona…" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Importe (€)" htmlFor="importe" error={errors.importe}>
            <Input
              id="importe"
              type="number"
              step="0.01"
              min="0"
              value={importe}
              onChange={(e) => setImporte(e.target.value)}
              placeholder="0,00"
            />
          </Field>
          <Field label="Fecha" htmlFor="fecha" error={errors.fecha}>
            <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </Field>
          <Field label="Tipo" htmlFor="tipo">
            <Select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Categoría" htmlFor="categoria">
            <Select
              id="categoria"
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
          <Field label="Estado" htmlFor="estado">
            <Select id="estado" value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)}>
              {ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {s === "Done" ? "Pagado" : "Pendiente"}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {formError && <p className="text-sm text-expense">{formError}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Guardando…" : "Crear"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
