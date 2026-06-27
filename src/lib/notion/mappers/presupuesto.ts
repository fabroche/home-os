import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { PRESUPUESTO } from "../schema";
import { readDate, readFiles, readNumber, readSelect, readStatus, readTitle } from "../properties";
import { MovimientoImportSchema, flujoDeTipo, type MovimientoImport } from "@/types/finanzas";

/** Página de Notion (DB Presupuesto) → forma de importación (sin `id`), validada con Zod. */
export function toMovimiento(page: PageObjectResponse): MovimientoImport {
  const p = page.properties;
  const tipo = readSelect(p[PRESUPUESTO.props.tipo]);
  return MovimientoImportSchema.parse({
    notionPageId: page.id,
    nombre: readTitle(p[PRESUPUESTO.props.nombre]),
    fecha: readDate(p[PRESUPUESTO.props.fecha]),
    importe: readNumber(p[PRESUPUESTO.props.importe]),
    categoria: readSelect(p[PRESUPUESTO.props.categoria]),
    tipo,
    estado: readStatus(p[PRESUPUESTO.props.estado]),
    facturas: readFiles(p[PRESUPUESTO.props.facturas]),
    comprobantes: readFiles(p[PRESUPUESTO.props.comprobantes]),
    flujo: flujoDeTipo(tipo),
    url: page.url,
    ultimaEdicion: page.last_edited_time,
  });
}
