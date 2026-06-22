import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NuevoMovimiento } from "./nuevo-movimiento";

/**
 * Alta de movimiento (gasto/ingreso). Por defecto muestra el disparador; al pulsarlo
 * despliega el formulario in-situ (importe en positivo; el signo se aplica por tipo).
 */
const meta = {
  title: "Finanzas/NuevoMovimiento",
  component: NuevoMovimiento,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof NuevoMovimiento>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
