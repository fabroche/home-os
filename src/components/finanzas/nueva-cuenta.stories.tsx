import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NuevaCuenta } from "./nueva-cuenta";

/** Alta de una cuenta de banco: disparador → formulario (nombre, tipo, saldo inicial). */
const meta = {
  title: "Finanzas/NuevaCuenta",
  component: NuevaCuenta,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof NuevaCuenta>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
