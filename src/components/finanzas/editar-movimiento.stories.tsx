import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { Movimiento } from "@/types/finanzas";
import { EditarMovimiento } from "./editar-movimiento";

const movimiento: Movimiento = {
  id: "demo",
  notionPageId: null,
  nombre: "Mercadona",
  fecha: "2026-07-01",
  importe: -42.5,
  categoria: "Comida",
  tipo: "Gasto Variable",
  estado: "Pending",
  cuentaId: null,
  tarjetaId: null,
  persona: null,
  facturas: [],
  comprobantes: [],
  flujo: "gasto",
  ultimaEdicion: "2026-07-01T00:00:00Z",
};

/** Formulario de edición de un movimiento, prefilado y mostrado en línea desde la tabla. */
const meta = {
  title: "Finanzas/EditarMovimiento",
  component: EditarMovimiento,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: {
    movimiento,
    cuentas: [{ id: "c1", nombre: "Cuenta principal" }],
    tarjetas: [{ id: "t1", nombre: "Visa" }],
    personas: ["Leo", "Pareja"],
  },
} satisfies Meta<typeof EditarMovimiento>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Gasto: Story = {};

export const Ingreso: Story = {
  args: {
    movimiento: {
      ...movimiento,
      nombre: "Nómina",
      importe: 1900,
      flujo: "ingreso",
      tipo: "Ingreso Fijo",
      categoria: "Salario",
    },
  },
};
