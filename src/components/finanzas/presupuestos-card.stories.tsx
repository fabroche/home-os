import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PresupuestosCard } from "./presupuestos-card";

const categorias = ["Comida", "Casa", "Osio", "Transporte"] as const;

/** Tarjeta de presupuestos: gastado/tope + barra de progreso del mes, con alta y borrado. */
const meta = {
  title: "Finanzas/PresupuestosCard",
  component: PresupuestosCard,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { categorias, mesLabel: "julio 2026" },
} satisfies Meta<typeof PresupuestosCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ConDatos: Story = {
  args: {
    items: [
      { id: "1", categoria: "Casa", tope: 800, gastado: 820, pct: 103, excedido: true },
      { id: "2", categoria: "Comida", tope: 250, gastado: 210, pct: 84, excedido: false },
      { id: "3", categoria: "Osio", tope: 150, gastado: 40, pct: 27, excedido: false },
    ],
  },
};

export const Vacio: Story = { args: { items: [] } };
