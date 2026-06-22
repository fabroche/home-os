import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EstadoToggle } from "./estado-toggle";

/** Toggle de estado de pago de un movimiento (Pendiente ↔ Pagado). */
const meta = {
  title: "Finanzas/EstadoToggle",
  component: EstadoToggle,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { pageId: "demo-page-id" },
} satisfies Meta<typeof EstadoToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pendiente: Story = { args: { estado: "Pending" } };

export const Pagado: Story = { args: { estado: "Done" } };
