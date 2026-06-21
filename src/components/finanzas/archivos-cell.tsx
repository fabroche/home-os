"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Receipt, Plus, Loader2 } from "lucide-react";
import { subirArchivoMovimiento } from "@/lib/actions/finanzas";
import { cn } from "@/lib/utils";

type Tipo = "factura" | "comprobante";

/** Enlaces a factura/comprobante + subida de nuevos archivos (a Storage → Notion). */
export function ArchivosCell({
  pageId,
  facturas,
  comprobantes,
}: {
  pageId: string;
  facturas: string[];
  comprobantes: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function subir(tipo: Tipo, file: File) {
    setError(null);
    const fd = new FormData();
    fd.set("pageId", pageId);
    fd.set("tipo", tipo);
    fd.set("file", file);
    startTransition(async () => {
      const res = await subirArchivoMovimiento(fd);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Grupo
        label="Factura"
        icon={<FileText className="size-3.5" />}
        urls={facturas}
        disabled={pending}
        onPick={(f) => subir("factura", f)}
      />
      <Grupo
        label="Comprobante"
        icon={<Receipt className="size-3.5" />}
        urls={comprobantes}
        disabled={pending}
        onPick={(f) => subir("comprobante", f)}
      />
      {pending && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
      {error && <span className="text-xs text-expense">{error}</span>}
    </div>
  );
}

function Grupo({
  label,
  icon,
  urls,
  disabled,
  onPick,
}: {
  label: string;
  icon: React.ReactNode;
  urls: string[];
  disabled?: boolean;
  onPick: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground">{icon}</span>
      {urls.map((u, i) => (
        <a
          key={u}
          href={u}
          target="_blank"
          rel="noopener noreferrer"
          title={`${label} ${i + 1}`}
          className="text-xs text-primary underline-offset-2 hover:underline"
        >
          {i + 1}
        </a>
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        title={`Subir ${label.toLowerCase()}`}
        className={cn(
          "grid size-5 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          disabled && "opacity-40",
        )}
      >
        <Plus className="size-3" />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
