import { DashboardHeader } from "@/components/layout/dashboard-header";
import { MobileNav } from "@/components/layout/mobile-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    // Padding inferior en móvil = alto de la bottom bar (h-16) + safe-area.
    <div className="pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      <DashboardHeader />
      {children}
      <MobileNav />
    </div>
  );
}
