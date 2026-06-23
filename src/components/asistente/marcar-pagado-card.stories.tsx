import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MarcarPagadoCard } from "./marcar-pagado-card";

/** Tarjeta de acción: la IA identifica un gasto pendiente y el usuario confirma marcarlo pagado. */
const meta = {
  title: "Asistente/MarcarPagadoCard",
  component: MarcarPagadoCard,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof MarcarPagadoCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pendiente: Story = {
  args: {
    movimiento: { id: "pg1", nombre: "Recibo de la luz", importe: 42.3 },
  },
};
