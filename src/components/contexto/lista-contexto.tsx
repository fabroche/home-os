"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Archive, Send, Undo2 } from "lucide-react";
import {
  TIPOS_CONTEXTO,
  ESTADOS_CONTEXTO,
  TIPO_LABEL,
  type EntradaContexto,
  type EstadoContexto,
} from "@/types/contexto";
import { cambiarEstado, eliminarEntrada } from "@/lib/actions/contexto";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { EditorEntrada } from "@/components/contexto/editor-entrada";
import { cn } from "@/lib/utils";

const ESTADO_TONE: Record<EstadoContexto, "neutral" | "brand" | "income"> = {
  borrador: "neutral",
  publicado: "income",
  archivado: "neutral",
};
const ESTADO_LABEL: Record<EstadoContexto, string> = {
  borrador: "Borrador",
  publicado: "Publicado",
  archivado: "Archivado",
};

type EditState = { mode: "new" } | { mode: "edit"; entrada: EntradaContexto } | null;

export function ListaContexto({ entradas }: { entradas: EntradaContexto[] }) {
  const [tipo, setTipo] = useState<string>("");
  const [estado, setEstado] = useState<string>("");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<EditState>(null);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtradas = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return entradas.filter((e) => {
      if (tipo && e.tipo !== tipo) return false;
      if (estado && e.estado !== estado) return false;
      if (needle) {
        const hay = `${e.titulo} ${e.contenido} ${e.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [entradas, tipo, estado, q]);

  function runAction(id: string, fn: () => Promise<unknown>) {
    setBusyId(id);
    startTransition(async () => {
      await fn();
      setBusyId(null);
    });
  }

  return (
    <div className="space-y-6">
      {/* Barra de acciones + filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button size="sm" onClick={() => setEdit({ mode: "new" })} arrow={false}>
          <Plus className="size-4" />
          Nueva entrada
        </Button>
        <div className="flex flex-wrap gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar…"
            className="h-9 w-44 py-1.5"
          />
          <Select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="h-9 w-auto py-1.5"
            aria-label="Filtrar por tipo"
          >
            <option value="">Todos los tipos</option>
            {TIPOS_CONTEXTO.map((t) => (
              <option key={t} value={t}>
                {TIPO_LABEL[t]}
              </option>
            ))}
          </Select>
          <Select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="h-9 w-auto py-1.5"
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            {ESTADOS_CONTEXTO.map((s) => (
              <option key={s} value={s}>
                {ESTADO_LABEL[s]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Editor (alta o edición) */}
      {edit && (
        <EditorEntrada
          entrada={edit.mode === "edit" ? edit.entrada : undefined}
          onClose={() => setEdit(null)}
        />
      )}

      {/* Listado */}
      {filtradas.length === 0 ? (
        <Card className="text-center text-sm text-muted-foreground">
          {entradas.length === 0
            ? "Aún no hay entradas. Crea la primera para enseñarle a la IA."
            : "Ningún resultado con esos filtros."}
        </Card>
      ) : (
        <ul className="space-y-3">
          {filtradas.map((e) => (
            <li key={e.id}>
              <Card hover className={cn(busyId === e.id && "opacity-60")}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{e.titulo}</h3>
                      <Badge tone="brand">{TIPO_LABEL[e.tipo]}</Badge>
                      <Badge tone={ESTADO_TONE[e.estado]}>{ESTADO_LABEL[e.estado]}</Badge>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{e.contenido}</p>
                    {e.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {e.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-foreground/[0.05] px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <IconButton
                      label="Editar"
                      onClick={() => setEdit({ mode: "edit", entrada: e })}
                    >
                      <Pencil className="size-4" />
                    </IconButton>
                    {e.estado !== "publicado" ? (
                      <IconButton
                        label="Publicar"
                        disabled={pending}
                        onClick={() => runAction(e.id, () => cambiarEstado(e.id, "publicado"))}
                      >
                        <Send className="size-4" />
                      </IconButton>
                    ) : (
                      <IconButton
                        label="Pasar a borrador"
                        disabled={pending}
                        onClick={() => runAction(e.id, () => cambiarEstado(e.id, "borrador"))}
                      >
                        <Undo2 className="size-4" />
                      </IconButton>
                    )}
                    {e.estado !== "archivado" && (
                      <IconButton
                        label="Archivar"
                        disabled={pending}
                        onClick={() => runAction(e.id, () => cambiarEstado(e.id, "archivado"))}
                      >
                        <Archive className="size-4" />
                      </IconButton>
                    )}
                    <IconButton
                      label="Eliminar"
                      disabled={pending}
                      danger
                      onClick={() => runAction(e.id, () => eliminarEntrada(e.id))}
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IconButton({
  label,
  children,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40",
        danger && "hover:bg-expense/10 hover:text-expense",
      )}
    >
      {children}
    </button>
  );
}
