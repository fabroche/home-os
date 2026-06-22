import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SyncButton } from "./sync-button";

/** Botón de sincronización manual Notion→Supabase + marca de la última sync. */
const meta = {
  title: "Finanzas/SyncButton",
  component: SyncButton,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof SyncButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NuncaSincronizado: Story = { args: { lastSync: null } };

export const SincronizadoReciente: Story = {
  args: { lastSync: "2026-06-22T18:00:00Z" },
};
