import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BorrarCard } from "./borrar-card";

/** Tarjeta de acción: la IA identifica un movimiento o deuda y el usuario confirma su borrado. */
const meta = {
  title: "Asistente/BorrarCard",
  component: BorrarCard,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof BorrarCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Movimiento: Story = {
  args: { objetivo: { tipo: "movimiento", id: "m1", nombre: "Café en el bar" } },
};

export const Deuda: Story = {
  args: { objetivo: { tipo: "deuda", id: "d1", nombre: "Préstamo a Leo" } },
};
