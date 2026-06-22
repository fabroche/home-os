import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NuevaDeuda } from "./nueva-deuda";

/**
 * Alta de deuda/pago. Disparador → formulario; permite elegir persona existente o crear una.
 */
const meta = {
  title: "Finanzas/NuevaDeuda",
  component: NuevaDeuda,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof NuevaDeuda>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { personas: ["Tía Anay", "Leo", "Guille"] },
};

export const SinPersonas: Story = { args: { personas: [] } };
