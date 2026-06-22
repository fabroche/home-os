import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { EntradaContexto } from "@/types/contexto";
import { EditorEntrada } from "./editor-entrada";

/** Formulario de alta/edición de una entrada de contexto (F-M4-1). */
const meta = {
  title: "Contexto/EditorEntrada",
  component: EditorEntrada,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { onClose: () => {} },
} satisfies Meta<typeof EditorEntrada>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Nueva: Story = {};

const entrada: EntradaContexto = {
  id: crypto.randomUUID(),
  tipo: "proveedor",
  titulo: "Naturgy",
  contenido: "Compañía de gas; factura mensual a domiciliar.",
  tags: ["gas", "hogar"],
  vigenteDesde: "2026-01-01",
  vigenteHasta: null,
  estado: "publicado",
  createdAt: "2026-06-01T00:00:00Z",
  updatedAt: "2026-06-01T00:00:00Z",
};

export const Edicion: Story = { args: { entrada } };
