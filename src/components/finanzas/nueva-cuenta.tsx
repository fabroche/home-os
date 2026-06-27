"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { crearCuenta } from "@/lib/actions/cuentas";
import { CUENTA_TIPOS, type CuentaTipo } from "@/types/cuentas";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Field } from "@/components/ui/input";

const TIPO_LABEL: Record<CuentaTipo, string> = {
  corriente: "Corriente",
  ahorro: "Ahorro",
  efectivo: "Efectivo",
};

/** Alta de una cuenta de banco (nativo Supabase). */
export function NuevaCuenta() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<CuentaTipo>("corriente");
  const [saldoInicial, setSaldoInicial] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const res = await crearCuenta({ nombre, tipo, saldoInicial: Number(saldoInicial) || 0 });
      if (res.ok) {
        setNombre("");
        setSaldoInicial("");
        setTipo("corriente");
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
        Cuenta
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
        Nueva <span className="serif-accent text-primary">cuenta</span>
      </h3>

      <form onSubmit={submit} className="mt-4 space-y-4">
        <Field label="Nombre" htmlFor="cuenta-nombre" error={errors.nombre}>
          <Input
            id="cuenta-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Santander, Revolut, Efectivo…"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo" htmlFor="cuenta-tipo">
            <Select id="cuenta-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as CuentaTipo)}>
              {CUENTA_TIPOS.map((t) => (
                <option key={t} value={t}>
                  {TIPO_LABEL[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Saldo inicial (€)" htmlFor="cuenta-saldo" error={errors.saldoInicial}>
            <Input
              id="cuenta-saldo"
              type="number"
              step="0.01"
              value={saldoInicial}
              onChange={(e) => setSaldoInicial(e.target.value)}
              placeholder="0,00"
            />
          </Field>
        </div>

        {formError && <p className="text-sm text-expense">{formError}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Guardando…" : "Crear cuenta"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
