import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { Movimiento } from "@/types/finanzas";
import { MovimientosTable } from "./movimientos-table";

/** Tabla de movimientos: búsqueda, filtros, orden y reflow a tarjetas en móvil. */
const meta = {
  title: "Finanzas/MovimientosTable",
  component: MovimientosTable,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof MovimientosTable>;

export default meta;
type Story = StoryObj<typeof meta>;

const mov = (over: Partial<Movimiento>): Movimiento => ({
  id: crypto.randomUUID(),
  notionPageId: crypto.randomUUID(),
  nombre: "Movimiento",
  fecha: "2026-06-01",
  importe: -50,
  categoria: "Casa",
  tipo: "Gasto Variable",
  estado: "Pending",
  facturas: [],
  comprobantes: [],
  flujo: "gasto",
  ultimaEdicion: "2026-06-01T00:00:00Z",
  ...over,
});

export const ConDatos: Story = {
  args: {
    movimientos: [
      mov({ nombre: "Nómina", importe: 2100, flujo: "ingreso", tipo: "Ingreso", categoria: "Trabajo", estado: "Done" }),
      mov({ nombre: "Alquiler", importe: -700, categoria: "Casa", estado: "Done", facturas: ["https://example.com/f.pdf"] }),
      mov({ nombre: "Mercadona", importe: -84.3, categoria: "Comida", fecha: "2026-06-12" }),
      mov({ nombre: "Préstamo a Leo", importe: -100, flujo: "deuda", tipo: "Deuda", categoria: null, fecha: "2026-06-15" }),
    ],
  },
};

export const Vacio: Story = { args: { movimientos: [] } };
