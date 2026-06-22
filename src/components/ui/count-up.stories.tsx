import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AnimatedNumber } from "./count-up";

/** Número con conteo ascendente al entrar en viewport (KPIs). */
const meta = {
  title: "UI/AnimatedNumber",
  component: AnimatedNumber,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof AnimatedNumber>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Moneda: Story = {
  args: { value: 4280.5, currency: "EUR", className: "text-3xl font-semibold nums" },
};

export const Entero: Story = {
  args: { value: 128, className: "text-3xl font-semibold nums" },
};

export const ConDecimales: Story = {
  args: { value: 73.42, decimals: 2, className: "text-3xl font-semibold nums" },
};
