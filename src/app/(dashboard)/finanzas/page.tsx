import { listMovimientos, listDeudas, resumen, ultimoSync } from "@/lib/services/finanzas";
import { gastosPorCategoria, porMes, resumenDeudas } from "@/lib/finanzas/aggregations";
import { PERSONAS_DEUDA } from "@/types/finanzas";
import { BarList } from "@/components/finanzas/bar-list";
import { SyncButton } from "@/components/finanzas/sync-button";
import { MovimientosTable } from "@/components/finanzas/movimientos-table";
import { NuevoMovimiento } from "@/components/finanzas/nuevo-movimiento";
import { NuevaDeuda } from "@/components/finanzas/nueva-deuda";
import { BorrarButton } from "@/components/finanzas/borrar-button";
import { Card, CardLabel } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/ui/count-up";
import { Reveal } from "@/components/motion/reveal";

// Lee del espejo en Supabase (el worker sincroniza desde Notion).
export const dynamic = "force-dynamic";

const eur = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

const mesLargo = (mes: string) => {
  const [y, m] = mes.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
};

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <Card>
      <CardLabel>{label}</CardLabel>
      <div className={`mt-2 text-2xl font-semibold nums sm:text-3xl ${accent ?? ""}`}>
        <AnimatedNumber value={value} currency="EUR" />
      </div>
    </Card>
  );
}

export default async function FinanzasPage() {
  const [movimientos, deudas, lastSync] = await Promise.all([
    listMovimientos(),
    listDeudas(),
    ultimoSync(),
  ]);
  const r = resumen(movimientos);
  const porCat = gastosPorCategoria(movimientos);
  const meses = porMes(movimientos);
  const rd = resumenDeudas(deudas);
  // Personas existentes (de los datos reales) unidas con las conocidas, para el alta de deuda.
  const personasDeuda = [
    ...new Set([
      ...deudas.map((d) => d.persona).filter((p): p is string => Boolean(p)),
      ...PERSONAS_DEUDA,
    ]),
  ].sort();

  return (
    <main className="container-app max-w-5xl py-8 sm:py-12">
      {/* Encabezado */}
      <Reveal id="fin-header">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl">
              <span className="serif-accent text-primary">Finanzas</span> al detalle
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {r.total} movimientos · datos desde Supabase, sincronizados desde Notion.
            </p>
          </div>
          <SyncButton lastSync={lastSync} />
        </div>
      </Reveal>

      {/* KPIs */}
      <Reveal id="fin-kpis" delay={0.05}>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Ingresos" value={r.ingresos} accent="text-income" />
          <Kpi label="Gastos" value={r.gastos} accent="text-expense" />
          <Kpi label="Balance" value={r.balance} accent="text-primary" />
          <Kpi label="Deudas por pagar" value={rd.total} accent="text-debt" />
        </div>
      </Reveal>

      {/* Categorías + Mensual */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Reveal id="fin-categorias">
          <section>
            <h2 className="mb-3 text-lg font-semibold">Gastos por categoría</h2>
            <Card>
              <BarList items={porCat.map((c) => ({ label: c.categoria, value: c.total }))} format={eur} />
            </Card>
          </section>
        </Reveal>

        <Reveal id="fin-mensual" delay={0.05}>
          <section>
            <h2 className="mb-3 text-lg font-semibold">Resumen mensual</h2>
            <div className="overflow-x-auto rounded-xl border border-border max-md:border-0">
              <table className="reflow-cards w-full text-sm">
                <thead className="bg-secondary text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Mes</th>
                    <th className="px-4 py-2.5 text-right font-medium">Ingresos</th>
                    <th className="px-4 py-2.5 text-right font-medium">Gastos</th>
                    <th className="px-4 py-2.5 text-right font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {meses.map((m) => (
                    <tr key={m.mes} className="border-t border-border transition-colors hover:bg-accent/50">
                      <td className="px-4 py-2.5 capitalize" data-label="Mes">{mesLargo(m.mes)}</td>
                      <td className="px-4 py-2.5 text-right nums text-income" data-label="Ingresos">{eur(m.ingresos)}</td>
                      <td className="px-4 py-2.5 text-right nums text-expense" data-label="Gastos">{eur(m.gastos)}</td>
                      <td className="px-4 py-2.5 text-right nums font-medium" data-label="Balance">{eur(m.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </Reveal>
      </div>

      {/* Deudas */}
      <Reveal id="fin-deudas">
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Deudas personales</h2>
          <div className="mb-4">
            <NuevaDeuda personas={personasDeuda} />
          </div>

          {/* Saldos: pendiente por pagar vs a favor por cobrar */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardLabel>Por pagar (debes)</CardLabel>
              <div className="mt-2 text-2xl font-semibold nums text-debt sm:text-3xl">{eur(rd.total)}</div>
            </Card>
            <Card>
              <CardLabel>A favor · por cobrar</CardLabel>
              <div className="mt-2 text-2xl font-semibold nums text-income sm:text-3xl">
                {eur(rd.totalPorCobrar)}
              </div>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardLabel className="mb-3">Pendiente por persona</CardLabel>
              {rd.porPersona.length > 0 ? (
                <BarList
                  items={rd.porPersona.map((p) => ({ label: p.persona, value: p.total }))}
                  format={eur}
                  barClassName="bg-debt"
                />
              ) : (
                <p className="text-sm text-muted-foreground">Sin deudas pendientes. 🎉</p>
              )}

              {rd.porCobrar.length > 0 && (
                <>
                  <CardLabel className="mb-3 mt-6">A favor por persona</CardLabel>
                  <BarList
                    items={rd.porCobrar.map((p) => ({ label: p.persona, value: p.total }))}
                    format={eur}
                    barClassName="bg-income"
                  />
                </>
              )}
            </Card>

            <div className="overflow-x-auto rounded-xl border border-border max-md:border-0">
              <table className="reflow-cards w-full text-sm">
                <thead className="bg-secondary text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Concepto</th>
                    <th className="px-4 py-2.5 font-medium">Persona</th>
                    <th className="px-4 py-2.5 text-right font-medium">Movimiento</th>
                    <th className="px-4 py-2.5 font-medium">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deudas.map((d) => (
                    <tr key={d.id} className="border-t border-border transition-colors hover:bg-accent/50">
                      <td className="px-4 py-2.5" data-label="Concepto">{d.concepto || "—"}</td>
                      <td className="px-4 py-2.5" data-label="Persona">{d.persona ?? "—"}</td>
                      <td
                        data-label="Movimiento"
                        className={`px-4 py-2.5 text-right nums ${
                          d.valor == null ? "" : d.valor < 0 ? "text-debt" : "text-income"
                        }`}
                      >
                        {d.valor != null ? eur(d.valor) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right max-md:text-left" data-label="Acciones">
                        <BorrarButton tipo="deuda" pageId={d.id} nombre={d.concepto || "deuda"} />
                      </td>
                    </tr>
                  ))}
                  {deudas.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                        Sin deudas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Movimientos */}
      <Reveal id="fin-movimientos">
        <h2 className="mt-10 mb-3 text-lg font-semibold">Movimientos</h2>
        <div className="mb-4">
          <NuevoMovimiento />
        </div>
        <MovimientosTable movimientos={movimientos} />
      </Reveal>
    </main>
  );
}
