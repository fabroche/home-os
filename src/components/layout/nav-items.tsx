import { Home, Wallet, CalendarDays, Inbox, Database, type LucideIcon } from "lucide-react";

/** Ítems de navegación, compartidos por el header (desktop) y la bottom bar (móvil). */
export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV: NavItem[] = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/finanzas", label: "Finanzas", icon: Wallet },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/backoffice", label: "Backoffice", icon: Inbox },
  { href: "/contexto", label: "Contexto", icon: Database },
];

/** Activo: "/" solo en exacto; el resto por prefijo (cubre subrutas). */
export const isActiveHref = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href);
