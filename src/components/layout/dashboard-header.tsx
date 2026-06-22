"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LogoutButton } from "@/components/layout/logout-button";
import { NAV, isActiveHref } from "@/components/layout/nav-items";

export function DashboardHeader() {
  const pathname = usePathname();
  const [sticky, setSticky] = useState(false);

  useEffect(() => {
    const onScroll = () => setSticky(window.scrollY >= 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) => isActiveHref(pathname, href);

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="container-app py-3">
        <nav
          className={cn(
            "flex items-center justify-between gap-3 rounded-full px-3 py-2 transition-all duration-300",
            sticky
              ? "border border-border bg-card/80 shadow-pill backdrop-blur-md"
              : "border border-transparent",
          )}
        >
          {/* Logotipo */}
          <Link href="/" className="flex items-center gap-2 pl-2 pr-1">
            <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
              h
            </span>
            <span className="text-base font-semibold tracking-tight">home·os</span>
          </Link>

          {/* Navegación (píldora con fondo tenue) */}
          <div className="hidden md:flex rounded-full bg-foreground/[0.04] p-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  isActive(n.href)
                    ? "bg-card text-foreground shadow-pill"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {n.label}
              </Link>
            ))}
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </nav>
      </div>
    </header>
  );
}
