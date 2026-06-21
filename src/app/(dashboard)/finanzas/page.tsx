import { listMovimientos, listDeudas, resumen } from "@/lib/services/finanzas";
import { gastosPorCategoria, porMes, resumenDeudas } from "@/lib/finanzas/aggregations";
import { BarList } from "@/components/finanzas/bar-list";
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

const COLOR_FLUJO: Record<string, string> = {
  ingreso: "text-income",
  gasto: "text-expense",
  deuda: "text-debt",
};

const TONO_FLUJO: Record<string, "income" | "expense" | "debt" | "neutral"> = {
  ingreso: "income",
  gasto: "expense",
  deuda: "debt",
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
      <div className={`mt-2 text-3xl font-semibold nums ${accent ?? ""}`}>
        <AnimatedNumber value={value} currency="EUR" />
      </div>
    </Card>
  );
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
    <main className="container-app max-w-5xl py-12">
      {/* Encabezado */}
      <Reveal>
        <h1 className="text-4xl">
          <span className="serif-accent text-primary">Finanzas</span> al detalle
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {r.total} movimientos · datos desde Supabase, sincronizados desde Notion.
        </p>
      </Reveal>

      {/* KPIs */}
      <Reveal delay={0.05}>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Ingresos" value={r.ingresos} accent="text-income" />
          <Kpi label="Gastos" value={r.gastos} accent="text-expense" />
          <Kpi label="Balance" value={r.balance} accent="text-primary" />
          <Kpi label="Deudas" value={rd.total} accent="text-debt" />
        </div>
      </Reveal>

      {/* Categorías + Mensual */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Reveal>
          <section>
            <h2 className="mb-3 text-lg font-semibold">Gastos por categoría</h2>
            <Card>
              <BarList items={porCat.map((c) => ({ label: c.categoria, value: c.total }))} format={eur} />
            </Card>
          </section>
        </Reveal>

        <Reveal delay={0.05}>
          <section>
            <h2 className="mb-3 text-lg font-semibold">Resumen mensual</h2>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
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
                      <td className="px-4 py-2.5 capitalize">{mesLargo(m.mes)}</td>
                      <td className="px-4 py-2.5 text-right nums text-income">{eur(m.ingresos)}</td>
                      <td className="px-4 py-2.5 text-right nums text-expense">{eur(m.gastos)}</td>
                      <td className="px-4 py-2.5 text-right nums font-medium">{eur(m.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </Reveal>
      </div>

      {/* Deudas */}
      <Reveal>
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Deudas personales</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardLabel className="mb-3">Por persona</CardLabel>
              <BarList
                items={rd.porPersona.map((p) => ({ label: p.persona, value: p.total }))}
                format={eur}
                barClassName="bg-debt"
              />
            </Card>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Concepto</th>
                    <th className="px-4 py-2.5 font-medium">Persona</th>
                    <th className="px-4 py-2.5 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {deudas.map((d) => (
                    <tr key={d.notionPageId} className="border-t border-border transition-colors hover:bg-accent/50">
                      <td className="px-4 py-2.5">{d.concepto || "—"}</td>
                      <td className="px-4 py-2.5">{d.persona ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right nums">
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
      </Reveal>

      {/* Movimientos recientes */}
      <Reveal>
        <h2 className="mt-10 mb-3 text-lg font-semibold">Movimientos recientes</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Fecha</th>
                <th className="px-4 py-2.5 font-medium">Nombre</th>
                <th className="px-4 py-2.5 font-medium">Categoría</th>
                <th className="px-4 py-2.5 font-medium">Tipo</th>
                <th className="px-4 py-2.5 text-right font-medium">Importe</th>
              </tr>
            </thead>
            <tbody>
              {recientes.map((m) => (
                <tr key={m.notionPageId} className="border-t border-border transition-colors hover:bg-accent/50">
                  <td className="px-4 py-2.5 nums text-muted-foreground">{m.fecha ?? "—"}</td>
                  <td className="px-4 py-2.5">{m.nombre || "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{m.categoria ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    {m.tipo ? <Badge tone={TONO_FLUJO[m.flujo] ?? "neutral"}>{m.tipo}</Badge> : "—"}
                  </td>
                  <td className={`px-4 py-2.5 text-right nums font-medium ${COLOR_FLUJO[m.flujo] ?? ""}`}>
                    {m.importe != null ? eur(m.importe) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
    </main>
  );
}
