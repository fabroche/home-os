import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Card, CardTitle, CardLabel } from "./card";

const meta = {
  title: "UI/Card",
  component: Card,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const KPI: Story = {
  render: () => (
    <Card className="max-w-xs">
      <CardLabel>Ingresos</CardLabel>
      <div className="mt-2 text-3xl font-semibold nums text-income">€1.240,50</div>
    </Card>
  ),
};

export const ConTitulo: Story = {
  render: () => (
    <Card className="max-w-sm">
      <CardTitle>Finanzas</CardTitle>
      <p className="mt-1 text-sm text-muted-foreground">Resumen del mes en curso.</p>
    </Card>
  ),
};

export const ConHover: Story = {
  render: () => (
    <Card hover className="max-w-sm">
      <CardTitle>Tarjeta enlace</CardTitle>
      <p className="mt-1 text-sm text-muted-foreground">
        Eleva y resalta el borde al pasar el ratón.
      </p>
    </Card>
  ),
};
