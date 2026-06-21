import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BarList } from "./bar-list";

const eur = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

const meta = {
  title: "Finanzas/BarList",
  component: BarList,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof BarList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const GastosPorCategoria: Story = {
  args: {
    format: eur,
    items: [
      { label: "Casa", value: 850 },
      { label: "Comida", value: 420 },
      { label: "Transporte", value: 180 },
      { label: "Restaurantes", value: 95 },
    ],
  },
};

export const PendientePorPersona: Story = {
  args: {
    format: eur,
    barClassName: "bg-debt",
    items: [
      { label: "Tia Anay", value: 250 },
      { label: "Leo", value: 50 },
    ],
  },
};

export const Vacio: Story = { args: { items: [] } };
