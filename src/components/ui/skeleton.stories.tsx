import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Skeleton } from "./skeleton";

/** Placeholder de carga con pulso; base de los skeletons a medida. */
const meta = {
  title: "UI/Skeleton",
  component: Skeleton,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Linea: Story = { args: { className: "h-4 w-48" } };

export const Avatar: Story = { args: { className: "size-12 rounded-full" } };

export const TarjetaKpi: Story = {
  render: () => (
    <div className="w-64 rounded-xl border border-border p-5">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-8 w-32" />
    </div>
  ),
};
