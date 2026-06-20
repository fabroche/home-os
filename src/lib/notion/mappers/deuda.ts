import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { DEUDAS } from "../schema";
import { readDate, readNumber, readSelect, readTitle } from "../properties";
import { DeudaSchema, type Deuda } from "@/types/finanzas";

/** Página de Notion (DB Deudas_Personales) → DTO de dominio `Deuda`, validado con Zod. */
export function toDeuda(page: PageObjectResponse): Deuda {
  const p = page.properties;
  return DeudaSchema.parse({
    notionPageId: page.id,
    concepto: readTitle(p[DEUDAS.props.concepto]),
    fechaCreacion: readDate(p[DEUDAS.props.fecha]),
    valor: readNumber(p[DEUDAS.props.valor]),
    persona: readSelect(p[DEUDAS.props.persona]),
    url: page.url,
    ultimaEdicion: page.last_edited_time,
  });
}
