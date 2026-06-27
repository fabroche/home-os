"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { crearTarjeta } from "@/lib/actions/cuentas";
import { TARJETA_TIPOS, type TarjetaTipo } from "@/types/cuentas";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Field } from "@/components/ui/input";

const SIN_CUENTA = "__sin__";

/** Alta de una tarjeta (débito/crédito). Para crédito muestra límite y días de corte/pago. */
export function NuevaTarjeta({ cuentas }: { cuentas: { id: string; nombre: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TarjetaTipo>("debito");
  const [cuentaId, setCuentaId] = useState<string>(SIN_CUENTA);
  const [limite, setLimite] = useState("");
  const [diaCorte, setDiaCorte] = useState("");
  const [diaPago, setDiaPago] = useState("");

  const esCredito = tipo === "credito";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    const num = (v: string) => (v.trim() === "" ? null : Number(v));
    startTransition(async () => {
      const res = await crearTarjeta({
        nombre,
        tipo,
        cuentaId: cuentaId === SIN_CUENTA ? null : cuentaId,
        limite: esCredito ? num(limite) : null,
        diaCorte: esCredito ? num(diaCorte) : null,
        diaPago: esCredito ? num(diaPago) : null,
      });
      if (res.ok) {
        setNombre("");
        setLimite("");
        setDiaCorte("");
        setDiaPago("");
        setTipo("debito");
        setCuentaId(SIN_CUENTA);
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
        Tarjeta
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
        Nueva <span className="serif-accent text-primary">tarjeta</span>
      </h3>

      <form onSubmit={submit} className="mt-4 space-y-4">
        <Field label="Nombre" htmlFor="tarjeta-nombre" error={errors.nombre}>
          <Input
            id="tarjeta-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Visa, Mastercard…"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo" htmlFor="tarjeta-tipo">
            <Select id="tarjeta-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TarjetaTipo)}>
              {TARJETA_TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t === "credito" ? "Crédito" : "Débito"}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cuenta" htmlFor="tarjeta-cuenta">
            <Select id="tarjeta-cuenta" value={cuentaId} onChange={(e) => setCuentaId(e.target.value)}>
              <option value={SIN_CUENTA}>— Sin cuenta —</option>
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {esCredito && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Límite (€)" htmlFor="tarjeta-limite" error={errors.limite}>
              <Input
                id="tarjeta-limite"
                type="number"
                step="0.01"
                min="0"
                value={limite}
                onChange={(e) => setLimite(e.target.value)}
                placeholder="2000"
              />
            </Field>
            <Field label="Día de corte" htmlFor="tarjeta-corte" error={errors.diaCorte}>
              <Input
                id="tarjeta-corte"
                type="number"
                min="1"
                max="28"
                value={diaCorte}
                onChange={(e) => setDiaCorte(e.target.value)}
                placeholder="1–28"
              />
            </Field>
            <Field label="Día de pago" htmlFor="tarjeta-pago" error={errors.diaPago}>
              <Input
                id="tarjeta-pago"
                type="number"
                min="1"
                max="28"
                value={diaPago}
                onChange={(e) => setDiaPago(e.target.value)}
                placeholder="1–28"
              />
            </Field>
          </div>
        )}

        {formError && <p className="text-sm text-expense">{formError}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Guardando…" : "Crear tarjeta"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
