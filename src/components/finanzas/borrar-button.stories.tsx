import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BorrarButton } from "./borrar-button";

/** Botón de borrado con confirmación en dos pasos. Sirve para movimientos y deudas. */
const meta = {
  title: "Finanzas/BorrarButton",
  component: BorrarButton,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { pageId: "demo-page-id", nombre: "Alquiler" },
} satisfies Meta<typeof BorrarButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Movimiento: Story = { args: { tipo: "movimiento" } };

export const Deuda: Story = { args: { tipo: "deuda", nombre: "Préstamo a Leo" } };
