import type { Movimiento } from "@/types/finanzas";

/**
 * Exportación de movimientos a CSV (lógica pura, testeable). Cabecera en español, un campo
 * por columna del dominio. El importe va con su signo y punto decimal (parseable en cualquier
 * hoja de cálculo). El consumidor añade un BOM UTF-8 para que Excel respete los acentos.
 */
const CSV_HEADERS = [
  "Fecha",
  "Nombre",
  "Categoría",
  "Tipo",
  "Estado",
  "Persona",
  "Flujo",
  "Importe",
] as const;

/** Escapa un campo CSV: entrecomilla si contiene coma, comilla o salto de línea. */
function escapeCsv(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function estadoLabel(estado: string | null): string {
  if (estado === "Done") return "Pagado";
  if (estado === "Pending") return "Pendiente";
  return estado ?? "";
}

/** Convierte una lista de movimientos a una cadena CSV (con cabecera). */
export function movimientosToCsv(movs: Movimiento[]): string {
  const filas = movs.map((m) => [
    m.fecha ?? "",
    m.nombre ?? "",
    m.categoria ?? "",
    m.tipo ?? "",
    estadoLabel(m.estado),
    m.persona ?? "",
    m.flujo,
    m.importe != null ? String(m.importe) : "",
  ]);
  return [CSV_HEADERS, ...filas]
    .map((fila) => fila.map((campo) => escapeCsv(String(campo))).join(","))
    .join("\r\n");
}
