import { listMovimientos, listDeudas, resumen, ultimoSync } from "@/lib/services/finanzas";
import {
  gastosPorCategoria,
  porMes,
  resumenDeudas,
  balancePorCuenta,
  aPagarPorTarjeta,
  gastoPorPersona,
} from "@/lib/finanzas/aggregations";
import { PERSONAS_DEUDA } from "@/types/finanzas";
import { BarList } from "@/components/finanzas/bar-list";
import { SyncButton } from "@/components/finanzas/sync-button";
import { MovimientosTable } from "@/components/finanzas/movimientos-table";
import { NuevoMovimiento } from "@/components/finanzas/nuevo-movimiento";
import { NuevaDeuda } from "@/components/finanzas/nueva-deuda";
import { NuevaCuenta } from "@/components/finanzas/nueva-cuenta";
import { NuevaTarjeta } from "@/components/finanzas/nueva-tarjeta";
import { NuevoPlanCuotas } from "@/components/finanzas/nuevo-plan-cuotas";
import { BorrarButton } from "@/components/finanzas/borrar-button";
import { listCuentas, listTarjetas } from "@/lib/services/cuentas";
import { listPlanes } from "@/lib/services/cuotas";
import { Card, CardLabel } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const [movimientos, deudas, lastSync, cuentas, tarjetas, planes] = await Promise.all([
    listMovimientos(),
    listDeudas(),
    ultimoSync(),
    listCuentas(),
    listTarjetas(),
    listPlanes(),
  ]);
  const r = resumen(movimientos);
  const porCat = gastosPorCategoria(movimientos);
  const meses = porMes(movimientos);
  const rd = resumenDeudas(deudas);
  // Resúmenes del modelo nativo: balance por cuenta, a-pagar de crédito y gasto por persona.
  const saldoCuentas = new Map(balancePorCuenta(movimientos, cuentas).map((x) => [x.cuenta.id, x.balance]));
  const aPagar = new Map(aPagarPorTarjeta(movimientos, tarjetas).map((x) => [x.tarjeta.id, x.total]));
  const gastoPersona = gastoPorPersona(movimientos);
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

      {/* Cuentas y tarjetas */}
      <Reveal id="fin-cuentas">
        <section className="mt-10">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Cuentas y tarjetas</h2>
            <div className="flex flex-wrap gap-2">
              <NuevaCuenta />
              <NuevaTarjeta cuentas={cuentas.map((c) => ({ id: c.id, nombre: c.nombre }))} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardLabel className="mb-3">Cuentas · balance</CardLabel>
              {cuentas.length > 0 ? (
                <ul className="space-y-2">
                  {cuentas.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium">
                        {c.nombre} <span className="font-normal capitalize text-muted-foreground">· {c.tipo}</span>
                      </span>
                      <span className="nums font-medium">{eur(saldoCuentas.get(c.id) ?? c.saldoInicial)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Aún no tienes cuentas. Crea la primera.</p>
              )}
            </Card>

            <Card>
              <CardLabel className="mb-3">Tarjetas</CardLabel>
              {tarjetas.length > 0 ? (
                <ul className="space-y-3">
                  {tarjetas.map((t) => {
                    const esCredito = t.tipo === "credito";
                    const desglose = esCredito ? gastoPorPersona(movimientos, t.id) : [];
                    return (
                      <li key={t.id} className="text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-2 font-medium">
                            {t.nombre}
                            <Badge tone={esCredito ? "brand" : "neutral"}>
                              {esCredito ? "Crédito" : "Débito"}
                            </Badge>
                          </span>
                          {esCredito && (
                            <span className="nums font-medium text-debt">
                              a pagar {eur(aPagar.get(t.id) ?? 0)}
                            </span>
                          )}
                        </div>
                        {desglose.length > 0 && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {desglose.map((d) => `${d.persona}: ${eur(d.total)}`).join(" · ")}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Aún no tienes tarjetas. Crea la primera.</p>
              )}
            </Card>
          </div>

          {gastoPersona.length > 0 && (
            <Card className="mt-4">
              <CardLabel className="mb-3">Gasto por persona</CardLabel>
              <BarList items={gastoPersona.map((g) => ({ label: g.persona, value: g.total }))} format={eur} />
            </Card>
          )}
        </section>
      </Reveal>

      {/* Gastos a plazos */}
      <Reveal id="fin-plazos">
        <section className="mt-10">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Gastos a plazos</h2>
            <NuevoPlanCuotas
              tarjetas={tarjetas.map((t) => ({ id: t.id, nombre: t.nombre }))}
              personas={personasDeuda}
            />
          </div>
          <Card>
            {planes.length > 0 ? (
              <ul className="space-y-3">
                {planes.map((p) => {
                  const cuota = Math.round((p.montoTotal / p.numCuotas) * 100) / 100;
                  const tarjeta = tarjetas.find((t) => t.id === p.tarjetaId)?.nombre;
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium">
                        {p.concepto}
                        {tarjeta && <span className="font-normal text-muted-foreground"> · {tarjeta}</span>}
                        {p.persona && <span className="font-normal text-muted-foreground"> · {p.persona}</span>}
                      </span>
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span className="nums">
                          {p.cuotasGeneradas}/{p.numCuotas} · {eur(cuota)}/mes
                        </span>
                        {p.estado === "completado" && <Badge tone="income">Completado</Badge>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sin planes a plazos. Crea uno para financiar una compra en cuotas.
              </p>
            )}
          </Card>
        </section>
      </Reveal>

      {/* Movimientos */}
      <Reveal id="fin-movimientos">
        <h2 className="mt-10 mb-3 text-lg font-semibold">Movimientos</h2>
        <div className="mb-4">
          <NuevoMovimiento
            cuentas={cuentas.map((c) => ({ id: c.id, nombre: c.nombre }))}
            tarjetas={tarjetas.map((t) => ({ id: t.id, nombre: t.nombre }))}
            personas={personasDeuda}
          />
        </div>
        <MovimientosTable movimientos={movimientos} />
      </Reveal>
    </main>
  );
}
