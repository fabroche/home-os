import { cn } from "@/lib/utils";

type Item = { label: string; value: number };

/** Lista de barras horizontales (server component, sin dependencias de gráficas). */
export function BarList({
  items,
  format = (n) => String(n),
  barClassName = "bg-primary",
}: {
  items: Item[];
  format?: (n: number) => string;
  barClassName?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin datos.</p>;
  }
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <div
          key={i.label}
          className="grid grid-cols-[7rem_1fr_5rem] items-center gap-3 text-sm sm:grid-cols-[9rem_1fr_6rem]"
        >
          <span className="truncate text-muted-foreground" title={i.label}>
            {i.label}
          </span>
          <span className="h-2.5 overflow-hidden rounded-full bg-secondary">
            <span
              className={cn("block h-2.5 rounded-full transition-[width] duration-500 ease-out", barClassName)}
              style={{ width: `${Math.max(2, (i.value / max) * 100)}%` }}
            />
          </span>
          <span className="text-right tabular-nums">{format(i.value)}</span>
        </div>
      ))}
    </div>
  );
}
