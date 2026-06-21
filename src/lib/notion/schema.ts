/**
 * Schema registry — ÚNICO lugar con los IDs de DB y los nombres de columnas de Notion.
 * Renombrar una columna en Notion = un solo cambio aquí (anti-patrón A10 evitado).
 *
 * Los IDs por defecto son los de tu workspace (DBs dentro de la página "Finances");
 * se pueden sobreescribir por entorno (NOTION_DB_PRESUPUESTO_ID / NOTION_DB_DEUDAS_ID).
 */
export const PRESUPUESTO = {
  id: process.env.NOTION_DB_PRESUPUESTO_ID ?? "2bb46da3a1d4801880c4cbc5c07e1a39",
  props: {
    nombre: "Name",
    fecha: "Date",
    importe: "amount",
    categoria: "category",
    tipo: "type",
    estado: "status",
    facturas: "invoices",
    comprobantes: "comprobante",
  },
} as const;

export const DEUDAS = {
  id: process.env.NOTION_DB_DEUDAS_ID ?? "2fb46da3a1d480538d51c44804e18bb1",
  props: {
    concepto: "Deuda",
    fecha: "Fecha de Creación",
    valor: "Valor",
    persona: "Persona_A_Pagar_Cobrar",
  },
} as const;
