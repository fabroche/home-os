import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./button";

const meta = {
  title: "UI/Button",
  component: Button,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { children: "Empezar" },
  argTypes: {
    variant: { control: "select", options: ["primary", "outline", "ghost", "soft"] },
    size: { control: "select", options: ["sm", "md", "lg", "icon"] },
    arrow: { control: "boolean" },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: "primary" } };
export const Outline: Story = { args: { variant: "outline" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Soft: Story = { args: { variant: "soft" } };
export const ConFlecha: Story = { args: { variant: "primary", arrow: true } };

export const Tamaños: Story = {
  render: (args) => (
    <div className="flex items-center gap-3">
      <Button {...args} size="sm">
        sm
      </Button>
      <Button {...args} size="md">
        md
      </Button>
      <Button {...args} size="lg">
        lg
      </Button>
    </div>
  ),
};

export const ComoEnlace: Story = {
  args: { href: "/finanzas", children: "Ir a Finanzas", arrow: true },
};
