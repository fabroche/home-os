"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, RefreshCw } from "lucide-react";
import { CATEGORIAS, TIPOS } from "@/types/finanzas";
import type { GastoRecurrente } from "@/types/recurrentes";
import { crearGastoRecurrente, archivarRecurrente } from "@/lib/actions/gastos-recurrentes";
import { Button } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { Input, Select, Field } from "@/components/ui/input";

const eur = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

const SIN = "__sin__";

function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Gastos recurrentes: lista los activos y permite crear uno (el worker genera un movimiento
 * cada mes el día indicado). Alta inline + archivar por ítem. Server Actions + refresh.
 */
export function GastosRecurrentesCard({
  recurrentes,
  cuentas = [],
  tarjetas = [],
  personas = [],
}: {
  recurrentes: GastoRecurrente[];
  cuentas?: { id: string; nombre: string }[];
  tarjetas?: { id: string; nombre: string }[];
  personas?: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>("Gasto Fijo");
  const [categoria, setCategoria] = useState<(typeof CATEGORIAS)[number]>("Casa");
  const [diaMes, setDiaMes] = useState("1");
  const [fechaInicio, setFechaInicio] = useState(hoy());
  const [cuentaId, setCuentaId] = useState<string>(SIN);
  const [tarjetaId, setTarjetaId] = useState<string>(SIN);
  const [persona, setPersona] = useState("");

  function crear(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const res = await crearGastoRecurrente({
        concepto,
        monto: Number(monto),
        tipo,
        categoria,
        diaMes: Number(diaMes),
        fechaInicio,
        cuentaId: cuentaId === SIN ? null : cuentaId,
        tarjetaId: tarjetaId === SIN ? null : tarjetaId,
        persona: persona.trim() || null,
      });
      if (res.ok) {
        setConcepto("");
        setMonto("");
        setOpen(false);
        router.refresh();
      } else {
        setFormError(res.error);
        if (res.fieldErrors) setErrors(res.fieldErrors);
      }
    });
  }

  function archivar(id: string) {
    startTransition(async () => {
      const res = await archivarRecurrente(id);
      if (res.ok) router.refresh();
      else setFormError(res.error);
    });
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <CardLabel>Gastos recurrentes</CardLabel>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
        >
          {open ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
          {open ? "Cerrar" : "Recurrente"}
        </button>
      </div>

      {open && (
        <form onSubmit={crear} className="mb-4 space-y-3">
          <Field label="Concepto" htmlFor="rec-concepto" error={errors.concepto}>
            <Input
              id="rec-concepto"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Alquiler, Netflix…"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Importe (€/mes)" htmlFor="rec-monto" error={errors.monto}>
              <Input
                id="rec-monto"
                type="number"
                step="0.01"
                min="0"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0,00"
              />
            </Field>
            <Field label="Día del mes" htmlFor="rec-dia" error={errors.diaMes}>
              <Input
                id="rec-dia"
                type="number"
                min="1"
                max="28"
                value={diaMes}
                onChange={(e) => setDiaMes(e.target.value)}
                placeholder="1–28"
              />
            </Field>
            <Field label="Tipo" htmlFor="rec-tipo">
              <Select id="rec-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Categoría" htmlFor="rec-categoria">
              <Select
                id="rec-categoria"
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
            <Field label="Desde" htmlFor="rec-desde" error={errors.fechaInicio}>
              <Input
                id="rec-desde"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </Field>
            <Field label="Cuenta" htmlFor="rec-cuenta">
              <Select id="rec-cuenta" value={cuentaId} onChange={(e) => setCuentaId(e.target.value)}>
                <option value={SIN}>— Sin cuenta —</option>
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tarjeta" htmlFor="rec-tarjeta">
              <Select id="rec-tarjeta" value={tarjetaId} onChange={(e) => setTarjetaId(e.target.value)}>
                <option value={SIN}>— Sin tarjeta —</option>
                {tarjetas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Persona" htmlFor="rec-persona">
              <Input
                id="rec-persona"
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                list="rec-personas"
                placeholder="Opcional"
              />
              <datalist id="rec-personas">
                {personas.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </Field>
          </div>

          {formError && <p className="text-sm text-expense">{formError}</p>}

          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Guardando…" : "Crear recurrente"}
          </Button>
        </form>
      )}

      {recurrentes.length > 0 ? (
        <ul className="space-y-2">
          {recurrentes.map((rec) => (
            <li key={rec.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <RefreshCw className="size-3.5 text-muted-foreground" />
                <span className="font-medium">{rec.concepto}</span>
                <span className="text-muted-foreground">· {rec.categoria} · día {rec.diaMes}</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="nums font-medium text-expense">{eur(rec.monto)}/mes</span>
                <button
                  type="button"
                  onClick={() => archivar(rec.id)}
                  aria-label={`Archivar ${rec.concepto}`}
                  title="Archivar (deja de generar)"
                  className="text-muted-foreground transition-colors hover:text-expense"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Sin gastos recurrentes. Crea uno (alquiler, suscripciones) y se generará solo cada mes.
        </p>
      )}
    </Card>
  );
}
