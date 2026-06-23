import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ActionCard } from "./action-card";

/** Tarjeta de acción: la IA propone un gasto y el usuario lo edita y confirma (tool calling). */
const meta = {
  title: "Asistente/ActionCard",
  component: ActionCard,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof ActionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Gasto: Story = {
  args: {
    propuesta: {
      nombre: "Comida en el bar",
      importe: 18.5,
      categoria: "Restaurantes",
      tipo: "Gasto Variable",
      fecha: "2026-06-23",
      estado: "Pending",
    },
  },
};

export const GastoFijo: Story = {
  args: {
    propuesta: {
      nombre: "Alquiler",
      importe: 650,
      categoria: "Casa",
      tipo: "Gasto Fijo",
      fecha: "2026-06-01",
      estado: "Pending",
    },
  },
};
