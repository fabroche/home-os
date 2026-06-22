import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ArchivosCell } from "./archivos-cell";

/** Enlaces a factura/comprobante + botón de subida (Storage → Notion). */
const meta = {
  title: "Finanzas/ArchivosCell",
  component: ArchivosCell,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { pageId: "demo-page-id" },
} satisfies Meta<typeof ArchivosCell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SinArchivos: Story = { args: { facturas: [], comprobantes: [] } };

export const ConArchivos: Story = {
  args: {
    facturas: ["https://example.com/factura-1.pdf"],
    comprobantes: ["https://example.com/comprobante-1.jpg", "https://example.com/comprobante-2.jpg"],
  },
};
