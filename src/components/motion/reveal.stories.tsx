import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Reveal } from "./reveal";
import { Card, CardTitle } from "@/components/ui/card";

/** Envoltura de revelado (fade + slide-up) al entrar en viewport. */
const meta = {
  title: "Motion/Reveal",
  component: Reveal,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { children: null },
} satisfies Meta<typeof Reveal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Reveal>
      <Card>
        <CardTitle>Contenido revelado</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          Aparece con un fade + slide-up discreto al entrar en viewport.
        </p>
      </Card>
    </Reveal>
  ),
};

export const Escalonado: Story = {
  render: () => (
    <div className="space-y-3">
      {[0, 0.1, 0.2].map((d) => (
        <Reveal key={d} delay={d}>
          <Card>
            <p className="text-sm">delay {d}s</p>
          </Card>
        </Reveal>
      ))}
    </div>
  ),
};
