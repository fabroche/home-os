import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { EntradaContexto } from "@/types/contexto";
import { ListaContexto } from "./lista-contexto";

/** Listado del banco de contexto con filtros y acciones (publicar/archivar/eliminar). */
const meta = {
  title: "Contexto/ListaContexto",
  component: ListaContexto,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof ListaContexto>;

export default meta;
type Story = StoryObj<typeof meta>;

const entrada = (over: Partial<EntradaContexto>): EntradaContexto => ({
  id: crypto.randomUUID(),
  tipo: "regla_financiera",
  titulo: "Mercadona = Comida",
  contenido: "Los cargos de Mercadona se categorizan como Comida.",
  tags: ["comida", "supermercado"],
  vigenteDesde: null,
  vigenteHasta: null,
  estado: "publicado",
  createdAt: "2026-06-01T00:00:00Z",
  updatedAt: "2026-06-01T00:00:00Z",
  ...over,
});

export const ConEntradas: Story = {
  args: {
    entradas: [
      entrada({}),
      entrada({ tipo: "proveedor", titulo: "Naturgy", contenido: "Compañía de gas; factura mensual.", tags: ["gas"], estado: "borrador" }),
      entrada({ tipo: "preferencia_viaje", titulo: "Asiento pasillo", contenido: "Prefiere pasillo en vuelos largos.", tags: ["viaje"], estado: "archivado" }),
    ],
  },
};

export const Vacia: Story = { args: { entradas: [] } };
