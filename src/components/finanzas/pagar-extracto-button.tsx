"use client";

import { useState, useTransition } from "react";
import { pagarExtracto } from "@/lib/actions/finanzas";

const eur = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

/**
 * Paga el extracto de una tarjeta de crédito con confirmación en dos pasos (sin modal): marca
 * sus cargos pendientes como liquidados vía Server Action; al refrescar, "a pagar" baja a 0 y
 * el saldo de la cuenta que liquida la tarjeta refleja la salida del dinero.
 */
export function PagarExtractoButton({ tarjetaId, total }: { tarjetaId: string; total: number }) {
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pagar() {
    setError(null);
    startTransition(async () => {
      const res = await pagarExtracto(tarjetaId);
      if (!res.ok) {
        setError(res.error);
        setConfirmando(false);
      }
      // En éxito, revalidatePath refresca: los cargos quedan liquidados y "a pagar" pasa a 0.
    });
  }

  if (confirmando) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">¿Pagar {eur(total)}?</span>
        <button
          type="button"
          onClick={pagar}
          disabled={pending}
          className="rounded-md px-2 py-0.5 font-medium text-income hover:bg-income/10 disabled:opacity-50"
        >
          Sí
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          disabled={pending}
          className="rounded-md px-2 py-0.5 text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          No
        </button>
        {error && <span className="text-expense">{error}</span>}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="rounded-md px-2 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 max-md:py-1.5"
      >
        Pagar extracto
      </button>
      {error && <span className="text-xs text-expense">{error}</span>}
    </span>
  );
}
