"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV, isActiveHref } from "@/components/layout/nav-items";

/**
 * Barra de navegación inferior (solo móvil, < md), estilo app nativa. Fija al
 * viewport y siempre visible: las secciones dejan de "flotar" y quedan al alcance
 * del pulgar. En desktop se usa la nav del header (esta se oculta).
 */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="flex items-stretch">
        {NAV.map((n) => {
          const active = isActiveHref(pathname, n.href);
          const Icon = n.icon;
          return (
            <li key={n.href} className="flex-1">
              <Link
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon
                  className={cn("size-5 transition-transform duration-200", active && "scale-110")}
                  aria-hidden
                />
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
