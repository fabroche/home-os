"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import type { Movimiento } from "@/types/finanzas";
import { EstadoToggle } from "@/components/finanzas/estado-toggle";
import { ArchivosCell } from "@/components/finanzas/archivos-cell";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const eur = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

const COLOR_FLUJO: Record<string, string> = {
  ingreso: "text-income",
  gasto: "text-expense",
  deuda: "text-debt",
};

const PAGE = 20;

type SortField = "fecha" | "nombre" | "importe";
type SortDir = "asc" | "desc";

// Comparador con nulos al final.
function cmp<T>(a: T | null, b: T | null, fn: (x: T, y: T) => number): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return fn(a, b);
}

/** Tabla de movimientos: búsqueda, filtros, orden por columnas y "cargar más". */
export function MovimientosTable({ movimientos }: { movimientos: Movimiento[] }) {
  const [q, setQ] = useState("");
  const [flujo, setFlujo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [estado, setEstado] = useState("");
  const [sortField, setSortField] = useState<SortField>("fecha");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [visible, setVisible] = useState(PAGE);

  const categorias = useMemo(
    () => [...new Set(movimientos.map((m) => m.categoria).filter((c): c is string => Boolean(c)))].sort(),
    [movimientos],
  );

  const filtradas = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = movimientos.filter((m) => {
      if (flujo && m.flujo !== flujo) return false;
      if (categoria && m.categoria !== categoria) return false;
      if (estado && m.estado !== estado) return false;
      if (needle) {
        const hay = `${m.nombre} ${m.categoria ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      if (sortField === "importe") return dir * cmp(a.importe, b.importe, (x, y) => x - y);
      if (sortField === "nombre") return dir * cmp(a.nombre || null, b.nombre || null, (x, y) => x.localeCompare(y));
      return dir * cmp(a.fecha, b.fecha, (x, y) => x.localeCompare(y));
    });
    return out;
  }, [movimientos, q, flujo, categoria, estado, sortField, sortDir]);

  const mostradas = filtradas.slice(0, visible);

  function toggleSort(field: SortField) {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "nombre" ? "asc" : "desc");
    }
  }

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-auto">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar nombre o categoría…"
            className="h-9 w-full py-1.5 pl-9 sm:w-56"
          />
        </div>
        <Select value={flujo} onChange={(e) => setFlujo(e.target.value)} className="h-9 w-auto py-1.5" aria-label="Filtrar por tipo">
          <option value="">Todos los tipos</option>
          <option value="ingreso">Ingreso</option>
          <option value="gasto">Gasto</option>
          <option value="deuda">Deuda</option>
        </Select>
        <Select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="h-9 w-auto py-1.5" aria-label="Filtrar por categoría">
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select value={estado} onChange={(e) => setEstado(e.target.value)} className="h-9 w-auto py-1.5" aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          <option value="Pending">Pendiente</option>
          <option value="Done">Pagado</option>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtradas.length} de {movimientos.length}
        </span>
      </div>

      {/* Tabla (se refluye a tarjetas apiladas en móvil) */}
      <div className="overflow-x-auto rounded-xl border border-border max-md:border-0">
        <table className="reflow-cards w-full text-sm">
          <thead className="bg-secondary text-left text-muted-foreground">
            <tr>
              <Th sortable field="fecha" current={sortField} dir={sortDir} onSort={toggleSort}>
                Fecha
              </Th>
              <Th sortable field="nombre" current={sortField} dir={sortDir} onSort={toggleSort}>
                Nombre
              </Th>
              <th className="px-4 py-2.5 font-medium">Categoría</th>
              <th className="px-4 py-2.5 font-medium">Estado</th>
              <th className="px-4 py-2.5 font-medium">Archivos</th>
              <Th sortable field="importe" current={sortField} dir={sortDir} onSort={toggleSort} align="right">
                Importe
              </Th>
            </tr>
          </thead>
          <tbody>
            {mostradas.map((m) => (
              <tr key={m.notionPageId} className="border-t border-border transition-colors hover:bg-accent/50">
                <td className="px-4 py-2.5 nums text-muted-foreground" data-label="Fecha">{m.fecha ?? "—"}</td>
                <td className="px-4 py-2.5 max-md:font-medium" data-label="Nombre">{m.nombre || "—"}</td>
                <td className="px-4 py-2.5 text-muted-foreground" data-label="Categoría">{m.categoria ?? "—"}</td>
                <td className="px-4 py-2.5" data-label="Estado">
                  <EstadoToggle pageId={m.notionPageId} estado={m.estado} />
                </td>
                <td className="px-4 py-2.5" data-label="Archivos">
                  <ArchivosCell pageId={m.notionPageId} facturas={m.facturas} comprobantes={m.comprobantes} />
                </td>
                <td className={`px-4 py-2.5 text-right nums font-medium ${COLOR_FLUJO[m.flujo] ?? ""}`} data-label="Importe">
                  {m.importe != null ? eur(m.importe) : "—"}
                </td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  {movimientos.length === 0 ? "Sin movimientos." : "Ningún movimiento con esos filtros."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cargar más */}
      {visible < filtradas.length && (
        <div className="flex justify-center">
          <Button variant="soft" size="sm" className="max-sm:h-11 max-sm:px-5" onClick={() => setVisible((v) => v + PAGE)}>
            Cargar más ({filtradas.length - visible} restantes)
          </Button>
        </div>
      )}
    </div>
  );
}

function Th({
  children,
  sortable,
  field,
  current,
  dir,
  onSort,
  align = "left",
}: {
  children: React.ReactNode;
  sortable?: boolean;
  field: SortField;
  current: SortField;
  dir: SortDir;
  onSort: (f: SortField) => void;
  align?: "left" | "right";
}) {
  const active = current === field;
  return (
    <th className={cn("px-4 py-2.5 font-medium", align === "right" && "text-right")}>
      {sortable ? (
        <button
          type="button"
          onClick={() => onSort(field)}
          className={cn(
            "inline-flex items-center gap-1 transition-colors hover:text-foreground",
            align === "right" && "flex-row-reverse",
            active && "text-foreground",
          )}
        >
          {children}
          {active &&
            (dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
        </button>
      ) : (
        children
      )}
    </th>
  );
}
