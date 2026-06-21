import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge } from "./badge";

const meta = {
  title: "UI/Badge",
  component: Badge,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { children: "Etiqueta" },
  argTypes: {
    tone: { control: "select", options: ["neutral", "brand", "income", "expense", "debt"] },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = { args: { tone: "neutral", children: "Borrador" } };
export const Brand: Story = { args: { tone: "brand", children: "Regla financiera" } };
export const Income: Story = { args: { tone: "income", children: "Ingreso" } };
export const Expense: Story = { args: { tone: "expense", children: "Gasto" } };
export const Debt: Story = { args: { tone: "debt", children: "Deuda" } };

export const Todos: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge tone="neutral">Neutral</Badge>
      <Badge tone="brand">Brand</Badge>
      <Badge tone="income">Income</Badge>
      <Badge tone="expense">Expense</Badge>
      <Badge tone="debt">Debt</Badge>
    </div>
  ),
};
