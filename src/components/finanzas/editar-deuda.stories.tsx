import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { Deuda } from "@/types/finanzas";
import { EditarDeuda } from "./editar-deuda";

const deuda: Deuda = {
  id: "demo",
  notionPageId: null,
  concepto: "Préstamo a Leo",
  fechaCreacion: "2026-07-01",
  valor: -100,
  persona: "Leo",
  ultimaEdicion: "2026-07-01T00:00:00Z",
};

/** Formulario de edición de una deuda/pago; el valor firmado se descompone en magnitud + tipo. */
const meta = {
  title: "Finanzas/EditarDeuda",
  component: EditarDeuda,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { deuda, personas: ["Leo", "Guille", "Tia Anay"] },
} satisfies Meta<typeof EditarDeuda>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Deudaa: Story = {};

export const Pago: Story = {
  args: { deuda: { ...deuda, concepto: "Pago mensual", valor: 50 } },
};
