import { listMovimientos, listDeudas, resumen } from "@/lib/services/finanzas";
import { gastosPorCategoria, porMes, resumenDeudas } from "@/lib/finanzas/aggregations";
import { BarList } from "@/components/finanzas/bar-list";

// Lee del espejo en Supabase (el worker sincroniza desde Notion).
export const dynamic = "force-dynamic";

const eur = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

const mesLargo = (mes: string) => {
  const [y, m] = mes.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
};

const COLOR_FLUJO: Record<string, string> = {
  ingreso: "text-[var(--income)]",
  gasto: "text-[var(--expense)]",
  deuda: "text-amber-600",
};

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border p-5">{children}</div>;
}

export default async function FinanzasPage() {
  const [movimientos, deudas] = await Promise.all([listMovimientos(), listDeudas()]);
  const r = resumen(movimientos);
  const porCat = gastosPorCategoria(movimientos);
  const meses = porMes(movimientos);
  const rd = resumenDeudas(deudas);
  const recientes = [...movimientos]
    .sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""))
    .slice(0, 15);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Finanzas</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {r.total} movimientos · datos desde Supabase, sincronizados desde Notion.
      </p>

      {/* KPIs */}
      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        <Card>
          <div className="text-sm text-muted-foreground">Ingresos</div>
          <div className="mt-1 text-2xl font-semibold text-[var(--income)]">{eur(r.ingresos)}</div>
        </Card>
        <Card>
          <div className="text-sm text-muted-foreground">Gastos</div>
          <div className="mt-1 text-2xl font-semibold text-[var(--expense)]">{eur(r.gastos)}</div>
        </Card>
        <Card>
          <div className="text-sm text-muted-foreground">Balance</div>
          <div className="mt-1 text-2xl font-semibold">{eur(r.balance)}</div>
        </Card>
        <Card>
          <div className="text-sm text-muted-foreground">Deudas</div>
          <div className="mt-1 text-2xl font-semibold text-amber-600">{eur(rd.total)}</div>
        </Card>
      </div>

      {/* Categorías + Mensual */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-medium">Gastos por categoría</h2>
          <Card>
            <BarList items={porCat.map((c) => ({ label: c.categoria, value: c.total }))} format={eur} />
          </Card>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-medium">Resumen mensual</h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Mes</th>
                  <th className="px-4 py-2 text-right font-medium">Ingresos</th>
                  <th className="px-4 py-2 text-right font-medium">Gastos</th>
                  <th className="px-4 py-2 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {meses.map((m) => (
                  <tr key={m.mes} className="border-t">
                    <td className="px-4 py-2 capitalize">{mesLargo(m.mes)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-[var(--income)]">{eur(m.ingresos)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-[var(--expense)]">{eur(m.gastos)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{eur(m.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Deudas */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-medium">Deudas personales</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <div className="mb-3 text-sm text-muted-foreground">Por persona</div>
            <BarList
              items={rd.porPersona.map((p) => ({ label: p.persona, value: p.total }))}
              format={eur}
              barClassName="bg-amber-500"
            />
          </Card>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Concepto</th>
                  <th className="px-4 py-2 font-medium">Persona</th>
                  <th className="px-4 py-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {deudas.map((d) => (
                  <tr key={d.notionPageId} className="border-t">
                    <td className="px-4 py-2">{d.concepto || "—"}</td>
                    <td className="px-4 py-2">{d.persona ?? "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {d.valor != null ? eur(Math.abs(d.valor)) : "—"}
                    </td>
                  </tr>
                ))}
                {deudas.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                      Sin deudas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Movimientos recientes */}
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
          </tbody>
        </table>
      </div>
    </main>
  );
}
