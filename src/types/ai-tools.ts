import { z } from "zod";
import { CATEGORIAS, TIPOS } from "@/types/finanzas";
import { CUENTA_TIPOS, TARJETA_TIPOS, CrearCuentaInputSchema, CrearTarjetaInputSchema } from "@/types/cuentas";
import { CrearPlanCuotasInputSchema } from "@/types/cuotas";
import { CrearPresupuestoInputSchema } from "@/types/presupuestos";
import { CrearGastoRecurrenteInputSchema } from "@/types/recurrentes";

/**
 * Registro de HERRAMIENTAS del asistente (M6 · tool calling genérico). Cada herramienta
 * reutiliza el MISMO esquema Zod con el que se crea la entidad (así la propuesta es
 * directamente confirmable) y describe sus campos (`campos`) para que UNA sola tarjeta
 * genérica la renderice y para armar la especificación del prompt del router.
 *
 * Es DATA pura (sin Server Actions): server y cliente lo importan. El mapeo herramienta→
 * Server Action vive en el cliente (`herramienta-card.tsx`), no aquí.
 */

export const HERRAMIENTAS = [
  "crear_cuenta",
  "crear_tarjeta",
  "crear_plan_cuotas",
  "crear_presupuesto",
  "crear_recurrente",
] as const;
export type Herramienta = (typeof HERRAMIENTAS)[number];

/** Un campo del formulario de una herramienta (dirige el render de la tarjeta genérica). */
export type CampoTool =
  | { key: string; label: string; tipo: "texto" | "numero" | "fecha"; opcional?: boolean; ayuda?: string }
  | { key: string; label: string; tipo: "select"; opciones: readonly string[]; opcional?: boolean }
  | { key: string; label: string; tipo: "entidad"; entidad: "cuenta" | "tarjeta"; opcional?: boolean }
  | { key: string; label: string; tipo: "persona"; opcional?: boolean };

export type ToolDef = {
  name: Herramienta;
  titulo: string;
  descripcion: string; // qué hace y cuándo usarla (para el prompt del router)
  accionLabel: string; // texto del botón de confirmar
  schema: z.ZodTypeAny; // valida la propuesta al confirmar (mismo del alta)
  campos: CampoTool[];
};

export const TOOLS: Record<Herramienta, ToolDef> = {
  crear_cuenta: {
    name: "crear_cuenta",
    titulo: "Crear cuenta",
    descripcion: "Crear una cuenta de banco (corriente/ahorro/efectivo) con un saldo inicial.",
    accionLabel: "Crear cuenta",
    schema: CrearCuentaInputSchema,
    campos: [
      { key: "nombre", label: "Nombre", tipo: "texto" },
      { key: "tipo", label: "Tipo", tipo: "select", opciones: CUENTA_TIPOS },
      { key: "saldoInicial", label: "Saldo inicial (€)", tipo: "numero", opcional: true },
    ],
  },
  crear_tarjeta: {
    name: "crear_tarjeta",
    titulo: "Crear tarjeta",
    descripcion: "Crear una tarjeta de débito o crédito. En crédito: límite y días de corte/pago.",
    accionLabel: "Crear tarjeta",
    schema: CrearTarjetaInputSchema,
    campos: [
      { key: "nombre", label: "Nombre", tipo: "texto" },
      { key: "tipo", label: "Tipo", tipo: "select", opciones: TARJETA_TIPOS },
      { key: "cuentaId", label: "Cuenta que liquida", tipo: "entidad", entidad: "cuenta", opcional: true },
      { key: "limite", label: "Límite (€)", tipo: "numero", opcional: true, ayuda: "solo crédito" },
      { key: "diaCorte", label: "Día de corte", tipo: "numero", opcional: true },
      { key: "diaPago", label: "Día de pago", tipo: "numero", opcional: true },
    ],
  },
  crear_plan_cuotas: {
    name: "crear_plan_cuotas",
    titulo: "Financiar a plazos",
    descripcion: "Crear un plan de cuotas: financiar una compra en N cuotas mensuales, normalmente con una tarjeta de crédito.",
    accionLabel: "Crear plan",
    schema: CrearPlanCuotasInputSchema,
    campos: [
      { key: "concepto", label: "Concepto", tipo: "texto" },
      { key: "montoTotal", label: "Monto total (€)", tipo: "numero" },
      { key: "numCuotas", label: "Nº de cuotas", tipo: "numero" },
      { key: "categoria", label: "Categoría", tipo: "select", opciones: CATEGORIAS },
      { key: "tipo", label: "Tipo", tipo: "select", opciones: TIPOS },
      { key: "fechaInicio", label: "Fecha de inicio", tipo: "fecha" },
      { key: "diaFacturacion", label: "Día de facturación", tipo: "numero", opcional: true },
      { key: "tarjetaId", label: "Tarjeta", tipo: "entidad", entidad: "tarjeta", opcional: true },
      { key: "persona", label: "Persona", tipo: "persona", opcional: true },
    ],
  },
  crear_presupuesto: {
    name: "crear_presupuesto",
    titulo: "Fijar presupuesto",
    descripcion: "Fijar el tope mensual de gasto de una categoría (seguimiento gastado vs tope).",
    accionLabel: "Guardar presupuesto",
    schema: CrearPresupuestoInputSchema,
    campos: [
      { key: "categoria", label: "Categoría", tipo: "select", opciones: CATEGORIAS },
      { key: "monto", label: "Tope (€/mes)", tipo: "numero" },
    ],
  },
  crear_recurrente: {
    name: "crear_recurrente",
    titulo: "Gasto recurrente",
    descripcion: "Crear un gasto que se repite cada mes (alquiler, suscripciones); se genera solo el día indicado.",
    accionLabel: "Crear recurrente",
    schema: CrearGastoRecurrenteInputSchema,
    campos: [
      { key: "concepto", label: "Concepto", tipo: "texto" },
      { key: "monto", label: "Importe (€/mes)", tipo: "numero" },
      { key: "categoria", label: "Categoría", tipo: "select", opciones: CATEGORIAS },
      { key: "tipo", label: "Tipo", tipo: "select", opciones: TIPOS },
      { key: "diaMes", label: "Día del mes", tipo: "numero" },
      { key: "fechaInicio", label: "Desde", tipo: "fecha" },
      { key: "cuentaId", label: "Cuenta", tipo: "entidad", entidad: "cuenta", opcional: true },
      { key: "tarjetaId", label: "Tarjeta", tipo: "entidad", entidad: "tarjeta", opcional: true },
      { key: "persona", label: "Persona", tipo: "persona", opcional: true },
    ],
  },
};

export const TOOL_LIST: ToolDef[] = HERRAMIENTAS.map((h) => TOOLS[h]);

/** Opciones para rellenar campos `entidad`/`persona` en la tarjeta genérica. */
export type OpcionesFinanzas = {
  cuentas: { id: string; nombre: string }[];
  tarjetas: { id: string; nombre: string }[];
  personas: string[];
};

/** Texto de un campo para el prompt del router (nombre + tipo/opciones). */
function campoSpec(c: CampoTool): string {
  const opc = "opcional" in c && c.opcional ? ", opc" : "";
  switch (c.tipo) {
    case "select":
      return `${c.key} (${c.opciones.join("|")}${opc})`;
    case "entidad":
      return `${c.key} (id EXACTO de una ${c.entidad === "cuenta" ? "CUENTA" : "TARJETA"} de la lista${opc})`;
    case "persona":
      return `${c.key} (nombre de persona${opc})`;
    case "numero":
      return `${c.key} (número${opc})`;
    case "fecha":
      return `${c.key} (YYYY-MM-DD${opc})`;
    default:
      return `${c.key} (texto${opc})`;
  }
}

/** Especificación de todas las herramientas para el prompt del router. */
export function especificacionTools(): string {
  return TOOL_LIST.map((t) => `  · ${t.name}: ${t.descripcion} Campos: ${t.campos.map(campoSpec).join(", ")}.`).join("\n");
}
