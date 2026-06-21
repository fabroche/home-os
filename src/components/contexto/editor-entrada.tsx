"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import {
  TIPOS_CONTEXTO,
  ESTADOS_CONTEXTO,
  TIPO_LABEL,
  type EntradaContexto,
} from "@/types/contexto";
import { guardarEntrada } from "@/lib/actions/contexto";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const ESTADO_LABEL: Record<string, string> = {
  borrador: "Borrador",
  publicado: "Publicado",
  archivado: "Archivado",
};

/** Formulario de alta/edición de una entrada de contexto (F-M4-1). */
export function EditorEntrada({
  entrada,
  onClose,
}: {
  entrada?: EntradaContexto;
  onClose: () => void;
}) {
  const [tipo, setTipo] = useState(entrada?.tipo ?? "regla_financiera");
  const [titulo, setTitulo] = useState(entrada?.titulo ?? "");
  const [contenido, setContenido] = useState(entrada?.contenido ?? "");
  const [tags, setTags] = useState((entrada?.tags ?? []).join(", "));
  const [vigenteDesde, setVigenteDesde] = useState(entrada?.vigenteDesde ?? "");
  const [vigenteHasta, setVigenteHasta] = useState(entrada?.vigenteHasta ?? "");
  const [estado, setEstado] = useState(entrada?.estado ?? "borrador");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const res = await guardarEntrada({
        id: entrada?.id,
        tipo,
        titulo,
        contenido,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        vigenteDesde,
        vigenteHasta,
        estado,
      });
      if (res.ok) {
        onClose();
      } else {
        setFormError(res.error);
        if (res.fieldErrors) setErrors(res.fieldErrors);
      }
    });
  }

  return (
    <Card className="relative">
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="size-5" />
      </button>

      <h2 className="text-lg font-semibold">
        {entrada ? "Editar" : "Nueva"} <span className="serif-accent text-primary">entrada</span>
      </h2>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo" htmlFor="tipo">
            <Select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
              {TIPOS_CONTEXTO.map((t) => (
                <option key={t} value={t}>
                  {TIPO_LABEL[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estado" htmlFor="estado">
            <Select
              id="estado"
              value={estado}
              onChange={(e) => setEstado(e.target.value as typeof estado)}
            >
              {ESTADOS_CONTEXTO.map((s) => (
                <option key={s} value={s}>
                  {ESTADO_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Título" htmlFor="titulo" error={errors.titulo}>
          <Input
            id="titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="p. ej. Mercadona = categoría Comida"
          />
        </Field>

        <Field label="Contenido" htmlFor="contenido" error={errors.contenido}>
          <Textarea
            id="contenido"
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            placeholder="El conocimiento que la IA debe recordar…"
          />
        </Field>

        <Field label="Tags (separados por comas)" htmlFor="tags">
          <Input
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="comida, supermercado"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vigente desde" htmlFor="desde">
            <Input
              id="desde"
              type="date"
              value={vigenteDesde ?? ""}
              onChange={(e) => setVigenteDesde(e.target.value)}
            />
          </Field>
          <Field label="Vigente hasta" htmlFor="hasta">
            <Input
              id="hasta"
              type="date"
              value={vigenteHasta ?? ""}
              onChange={(e) => setVigenteHasta(e.target.value)}
            />
          </Field>
        </div>

        {formError && <p className="text-sm text-expense">{formError}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending} size="sm">
            {pending ? "Guardando…" : "Guardar"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
