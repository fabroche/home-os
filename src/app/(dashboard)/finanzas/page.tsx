import { listMovimientos, resumen } from "@/lib/services/finanzas";

// Lectura en vivo de Notion (interim, hasta el sync a Supabase de M1).
export const dynamic = "force-dynamic";

const eur = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

const COLOR_FLUJO: Record<string, string> = {
  ingreso: "text-[var(--income)]",
  gasto: "text-[var(--expense)]",
  deuda: "text-amber-600",
};

export default async function FinanzasPage() {
  const movimientos = await listMovimientos();
  const r = resumen(movimientos);
  const recientes = [...movimientos]
    .sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""))
    .slice(0, 20);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Finanzas</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Lectura en vivo de Notion ({r.total} movimientos). Interim hasta el sync a Supabase (M1).
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-5">
          <div className="text-sm text-muted-foreground">Ingresos</div>
          <div className="mt-1 text-2xl font-semibold text-[var(--income)]">{eur(r.ingresos)}</div>
        </div>
        <div className="rounded-lg border p-5">
          <div className="text-sm text-muted-foreground">Gastos</div>
          <div className="mt-1 text-2xl font-semibold text-[var(--expense)]">{eur(r.gastos)}</div>
        </div>
        <div className="rounded-lg border p-5">
          <div className="text-sm text-muted-foreground">Balance</div>
          <div className="mt-1 text-2xl font-semibold">{eur(r.balance)}</div>
        </div>
      </div>

      <h2 className="mt-10 mb-3 text-lg font-medium">Movimientos recientes</h2>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Fecha</th>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Categoría</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 text-right font-medium">Importe</th>
            </tr>
          </thead>
          <tbody>
            {recientes.map((m) => (
              <tr key={m.notionPageId} className="border-t">
                <td className="px-4 py-2 tabular-nums text-muted-foreground">{m.fecha ?? "—"}</td>
                <td className="px-4 py-2">{m.nombre || "—"}</td>
                <td className="px-4 py-2">{m.categoria ?? "—"}</td>
                <td className="px-4 py-2">{m.tipo ?? "—"}</td>
                <td className={`px-4 py-2 text-right tabular-nums ${COLOR_FLUJO[m.flujo] ?? ""}`}>
                  {m.importe != null ? eur(m.importe) : "—"}
                </td>
              </tr>
            ))}
            {recientes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Sin movimientos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
