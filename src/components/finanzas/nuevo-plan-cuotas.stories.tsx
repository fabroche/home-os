import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NuevoPlanCuotas } from "./nuevo-plan-cuotas";

/** Alta de gasto a plazos: total + nº de cuotas; la 1 se crea ya, el resto las genera el worker. */
const meta = {
  title: "Finanzas/NuevoPlanCuotas",
  component: NuevoPlanCuotas,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { tarjetas: [{ id: "t1", nombre: "Visa crédito" }], personas: ["Ana"] },
} satisfies Meta<typeof NuevoPlanCuotas>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SinTarjetas: Story = { args: { tarjetas: [], personas: [] } };
