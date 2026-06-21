import { ArrowUpRight } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Reveal } from "@/components/motion/reveal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const MODULOS = [
  { href: "/finanzas", titulo: "Finanzas", desc: "Notion + facturas del correo", tone: "text-income" },
  { href: "/calendario", titulo: "Calendario", desc: "Viajes, eventos y avisos", tone: "text-azure" },
  { href: "/backoffice", titulo: "Backoffice", desc: "Triaje de tus correos", tone: "text-tangerine" },
  { href: "/contexto", titulo: "Banco de contexto", desc: "Conocimiento para la IA", tone: "text-iris" },
];

export default function HomePage() {
  return (
    <>
      <DashboardHeader />
      <main className="relative overflow-hidden">
        <div className="glow-bg" aria-hidden />

        <section className="container-app pt-20 pb-12 text-center sm:pt-28">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-lime" />
              Sistema de gestión personal
            </span>
          </Reveal>

          <Reveal delay={0.05}>
            <h1 className="mx-auto mt-6 max-w-3xl text-balance text-5xl sm:text-7xl">
              Tu vida, <span className="serif-accent text-primary">ordenada</span> en
              un solo lugar
            </h1>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="mx-auto mt-5 max-w-xl text-balance text-muted-foreground sm:text-lg">
              Finanzas, calendario inteligente, triaje de correo y un banco de contexto
              para la IA. Todo conectado, todo bajo control.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="mt-8 flex justify-center">
              <Button href="/finanzas" size="lg" arrow>
                Ir a Finanzas
              </Button>
            </div>
          </Reveal>
        </section>

        <section className="container-app pb-24">
          <div className="grid gap-4 sm:grid-cols-2">
            {MODULOS.map((m, i) => (
              <Reveal key={m.href} delay={0.05 * i} as="div">
                <Card hover className="group relative h-full">
                  <a href={m.href} className="absolute inset-0" aria-label={m.titulo} />
                  <div className="flex items-start justify-between">
                    <div>
                      <div className={`text-lg font-semibold ${m.tone}`}>{m.titulo}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{m.desc}</div>
                    </div>
                    <ArrowUpRight className="size-5 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
