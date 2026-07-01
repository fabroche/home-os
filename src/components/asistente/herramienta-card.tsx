"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { crearCuenta, crearTarjeta } from "@/lib/actions/cuentas";
import { crearPlanCuotas } from "@/lib/actions/cuotas";
import { guardarPresupuesto } from "@/lib/actions/presupuestos";
import { crearGastoRecurrente } from "@/lib/actions/gastos-recurrentes";
import { TOOLS, type Herramienta, type CampoTool, type OpcionesFinanzas } from "@/types/ai-tools";
import { cn } from "@/lib/utils";
import { Card, CardLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AccionResuelta } from "@/components/asistente/chat-message";

type WriteLike = { ok: true; id?: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Mapeo herramienta → Server Action (vive en el cliente; el registro `TOOLS` es data pura). */
const ACCIONES: Record<Herramienta, (input: unknown) => Promise<WriteLike>> = {
  crear_cuenta: crearCuenta,
  crear_tarjeta: crearTarjeta,
  crear_plan_cuotas: crearPlanCuotas,
  crear_presupuesto: guardarPresupuesto,
  crear_recurrente: crearGastoRecurrente,
};

const field = "mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm text-foreground";

function valorInicial(campo: CampoTool, propuesta: Record<string, unknown>): string {
  const raw = propuesta[campo.key];
  if (campo.tipo === "select") {
    return campo.opciones.includes(String(raw)) ? String(raw) : (campo.opciones[0] ?? "");
  }
  return raw == null ? "" : String(raw);
}

/**
 * Tarjeta genérica de acción del Asistente (M6 · tool calling): renderiza la propuesta de
 * CUALQUIER herramienta de creación (cuenta, tarjeta, plan, presupuesto, recurrente) a partir
 * de su registro `TOOLS`. El usuario revisa/edita y confirma; SOLO entonces se escribe
 * (gobernanza "propone → aprueba → crea"). Una sola card cubre todas las herramientas.
 */
export function HerramientaCard({
  herramienta,
  propuesta,
  opciones,
  resueltoInicial,
  onResuelto,
}: {
  herramienta: Herramienta;
  propuesta: Record<string, unknown>;
  opciones: OpcionesFinanzas;
  resueltoInicial?: AccionResuelta;
  onResuelto?: (estado: AccionResuelta) => void;
}) {
  const tool = TOOLS[herramienta];
  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(tool.campos.map((c) => [c.key, valorInicial(c, propuesta)])),
  );
  const [resueltoLocal, setResueltoLocal] = useState<AccionResuelta | null>(null);
  const resuelto = resueltoLocal ?? resueltoInicial ?? null;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function construirPayload(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const c of tool.campos) {
      const raw = (form[c.key] ?? "").trim();
      if (raw === "") continue; // vacío → omitido: aplican defaults/opcionales del esquema
      out[c.key] = c.tipo === "numero" ? Number(raw) : raw;
    }
    return out;
  }

  function confirmar() {
    setError(null);
    startTransition(async () => {
      const res = await ACCIONES[herramienta](construirPayload());
      if (res.ok) {
        setResueltoLocal("creado");
        onResuelto?.("creado");
      } else {
        const primer = res.fieldErrors ? Object.values(res.fieldErrors)[0] : undefined;
        setError(primer ?? res.error);
      }
    });
  }

  if (resuelto) {
    const nombre = form.nombre || form.concepto || tool.titulo;
    const etiqueta =
      resuelto === "creado" ? "Creado" : resuelto === "superado" ? "Descartado (lo reescribiste)" : "Cancelado";
    return (
      <Card className="flex items-center gap-2 text-sm text-muted-foreground">
        <Check className="size-4 text-income" />
        {etiqueta}: <span className="font-medium text-foreground">{nombre}</span>
      </Card>
    );
  }

  return (
    <Card>
      <CardLabel>{tool.titulo}</CardLabel>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {tool.campos.map((c) => (
          <label
            key={c.key}
            className={cn("block text-xs text-muted-foreground", c.tipo === "texto" && "col-span-2")}
          >
            {c.label}
            {"opcional" in c && c.opcional && <span className="text-muted-foreground/60"> (opc)</span>}
            <CampoInput campo={c} valor={form[c.key] ?? ""} onChange={(v) => set(c.key, v)} opciones={opciones} />
          </label>
        ))}
      </div>

      {error && <p className="mt-2 text-sm text-expense">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={confirmar}>
          {pending ? "Creando…" : tool.accionLabel}
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

function CampoInput({
  campo,
  valor,
  onChange,
  opciones,
}: {
  campo: CampoTool;
  valor: string;
  onChange: (v: string) => void;
  opciones: OpcionesFinanzas;
}) {
  if (campo.tipo === "select") {
    return (
      <select value={valor} onChange={(e) => onChange(e.target.value)} className={field}>
        {campo.opciones.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  if (campo.tipo === "entidad") {
    const lista = campo.entidad === "cuenta" ? opciones.cuentas : opciones.tarjetas;
    return (
      <select value={valor} onChange={(e) => onChange(e.target.value)} className={field}>
        <option value="">— ninguna —</option>
        {lista.map((x) => (
          <option key={x.id} value={x.id}>
            {x.nombre}
          </option>
        ))}
      </select>
    );
  }
  if (campo.tipo === "persona") {
    return (
      <>
        <Input value={valor} onChange={(e) => onChange(e.target.value)} list={`op-personas`} className="mt-1 h-9" />
        <datalist id="op-personas">
          {opciones.personas.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </>
    );
  }
  if (campo.tipo === "fecha") {
    return <input type="date" value={valor} onChange={(e) => onChange(e.target.value)} className={field} />;
  }
  if (campo.tipo === "numero") {
    return (
      <Input
        type="number"
        inputMode="decimal"
        step="0.01"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-9"
      />
    );
  }
  return <Input value={valor} onChange={(e) => onChange(e.target.value)} className="mt-1 h-9" />;
}
