import Link from "next/link";
import { logout } from "@/lib/actions/auth";

const NAV = [
  { href: "/", label: "Inicio" },
  { href: "/finanzas", label: "Finanzas" },
  { href: "/calendario", label: "Calendario" },
  { href: "/backoffice", label: "Backoffice" },
  { href: "/contexto", label: "Contexto" },
];

export function DashboardHeader() {
  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <nav className="flex flex-wrap gap-4 text-sm">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="text-muted-foreground hover:text-foreground">
            {n.label}
          </Link>
        ))}
      </nav>
      <form action={logout}>
        <button className="text-sm text-muted-foreground hover:text-foreground">Salir</button>
      </form>
    </header>
  );
}
