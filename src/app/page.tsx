import Link from "next/link";

const MODULOS = [
  { href: "/finanzas", titulo: "Finanzas", desc: "Notion + facturas del correo" },
  { href: "/calendario", titulo: "Calendario", desc: "Viajes, eventos y avisos" },
  { href: "/backoffice", titulo: "Backoffice", desc: "Triaje de tus correos" },
  { href: "/contexto", titulo: "Banco de contexto", desc: "Conocimiento para la IA" },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">home-os</h1>
      <p className="mt-2 text-muted-foreground">
        Scaffold inicial. Cada módulo se implementa por separado (ver <code>docs/</code>).
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {MODULOS.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="rounded-lg border p-5 transition-colors hover:bg-accent"
          >
            <div className="font-medium">{m.titulo}</div>
            <div className="text-sm text-muted-foreground">{m.desc}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
