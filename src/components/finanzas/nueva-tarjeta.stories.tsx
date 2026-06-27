import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NuevaTarjeta } from "./nueva-tarjeta";

/** Alta de tarjeta: débito o crédito (crédito muestra límite y días de corte/pago). */
const meta = {
  title: "Finanzas/NuevaTarjeta",
  component: NuevaTarjeta,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { cuentas: [{ id: "c1", nombre: "Santander" }, { id: "c2", nombre: "Revolut" }] },
} satisfies Meta<typeof NuevaTarjeta>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SinCuentas: Story = { args: { cuentas: [] } };
