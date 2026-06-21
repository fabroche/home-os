import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton a medida de la página de Finanzas (mismo layout que page.tsx para no
 * provocar saltos). Actualizar cuando cambie la estructura de la página.
 */
export default function FinanzasLoading() {
  return (
    <main className="container-app max-w-5xl py-12">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>

      {/* KPIs */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-8 w-28" />
          </Card>
        ))}
      </div>

      {/* Categorías + Mensual */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <Skeleton className="mb-4 h-4 w-40" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2.5 flex-1 rounded-full" />
                <Skeleton className="h-3 w-14" />
              </div>
            ))}
          </div>
        </Card>
        <div className="rounded-xl border border-border p-4">
          <Skeleton className="mb-4 h-4 w-40" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Deudas */}
      <Skeleton className="mt-10 h-6 w-48" />
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-3 h-8 w-28" />
          </Card>
        ))}
      </div>

      {/* Movimientos recientes */}
      <Skeleton className="mt-10 h-6 w-56" />
      <Skeleton className="mt-3 h-9 w-44 rounded-full" />
      <div className="mt-4 rounded-xl border border-border p-4">
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      </div>
    </main>
  );
}
