import { cn } from "@/lib/utils";

/** Bloque de carga (placeholder) con pulso. Base de los skeletons a medida. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}
