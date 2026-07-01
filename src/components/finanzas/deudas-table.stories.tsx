import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { Deuda } from "@/types/finanzas";
import { DeudasTable } from "./deudas-table";

/** Tabla de deudas/pagos con edición y borrado en línea; reflow a tarjetas en móvil. */
const meta = {
  title: "Finanzas/DeudasTable",
  component: DeudasTable,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof DeudasTable>;

export default meta;
type Story = StoryObj<typeof meta>;

const deuda = (over: Partial<Deuda>): Deuda => ({
  id: crypto.randomUUID(),
  notionPageId: null,
  concepto: "Préstamo",
  fechaCreacion: "2026-07-01",
  valor: -100,
  persona: "Leo",
  ultimaEdicion: "2026-07-01T00:00:00Z",
  ...over,
});

export const ConDatos: Story = {
  args: {
    deudas: [
      deuda({ concepto: "Préstamo a Leo", valor: -100, persona: "Leo" }),
      deuda({ concepto: "Pago de Guille", valor: 50, persona: "Guille" }),
    ],
    personas: ["Leo", "Guille", "Tia Anay"],
  },
};

export const Vacio: Story = { args: { deudas: [], personas: [] } };
