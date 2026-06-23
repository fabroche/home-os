import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DeudaCard } from "./deuda-card";

/** Tarjeta de acción: la IA propone un alta de deuda o pago y el usuario confirma. */
const meta = {
  title: "Asistente/DeudaCard",
  component: DeudaCard,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof DeudaCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Deuda: Story = {
  args: {
    propuesta: { concepto: "Préstamo", persona: "Leo", valor: 50, movimiento: "deuda", fecha: "2026-06-23" },
  },
};

export const Pago: Story = {
  args: {
    propuesta: { concepto: "Devolución", persona: "Guille", valor: 20, movimiento: "pago", fecha: "2026-06-23" },
  },
};
