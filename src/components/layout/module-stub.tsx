import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";

/** Placeholder con identidad para módulos aún no implementados. */
export function ModuleStub({
  titulo,
  accent,
  modulo,
  children,
}: {
  titulo: string;
  /** Palabra/s del título que van en serif italic. */
  accent: string;
  modulo: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative container-app max-w-5xl overflow-hidden py-16">
      <div className="glow-bg" aria-hidden />
      <Reveal>
        <Badge tone="brand">{modulo} · próximamente</Badge>
        <h1 className="mt-4 text-4xl sm:text-5xl">
          {titulo} <span className="serif-accent text-primary">{accent}</span>
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">{children}</p>
      </Reveal>
    </main>
  );
}
