"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { syncFinanzasAction } from "@/lib/actions/finanzas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Estado = { tipo: "ok"; texto: string } | { tipo: "error"; texto: string } | null;

/** Botón de sincronización manual Notion→Supabase para la vista de finanzas. */
export function SyncButton({ lastSync }: { lastSync: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [estado, setEstado] = useState<Estado>(null);
  const [syncAt, setSyncAt] = useState<string | null>(lastSync);

  function handleSync() {
    setEstado(null);
    startTransition(async () => {
      const res = await syncFinanzasAction();
      if (res.ok) {
        setSyncAt(res.at);
        const borrados = res.movimientosBorrados + res.deudasBorrados;
        const sufijo = borrados > 0 ? ` · ${borrados} eliminados` : "";
        setEstado({
          tipo: "ok",
          texto: `Actualizado · ${res.movimientos} movimientos, ${res.deudas} deudas${sufijo}`,
        });
        router.refresh(); // re-renderiza el server component con los datos frescos
      } else {
        setEstado({ tipo: "error", texto: res.error });
      }
    });
  }

  const relativo = syncAt
    ? formatDistanceToNow(new Date(syncAt), { addSuffix: true, locale: es })
    : null;

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <Button variant="outline" size="sm" onClick={handleSync} disabled={pending}>
        <RefreshCw className={cn("size-4", pending && "animate-spin")} />
        {pending ? "Sincronizando…" : "Sincronizar"}
      </Button>
      {estado ? (
        <span className={cn("text-xs", estado.tipo === "ok" ? "text-income" : "text-expense")}>
          {estado.texto}
        </span>
      ) : (
        relativo && (
          <span className="text-xs text-muted-foreground">Última sync {relativo}</span>
        )
      )}
    </div>
  );
}
