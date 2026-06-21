import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Input, Textarea, Select, Field } from "./input";

const meta = {
  title: "UI/Form",
  component: Input,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InputBasico: Story = {
  render: () => <Input placeholder="Email" className="max-w-sm" />,
};

export const CampoConEtiqueta: Story = {
  render: () => (
    <Field label="Título" htmlFor="t" className="max-w-sm">
      <Input id="t" placeholder="p. ej. Mercadona = Comida" />
    </Field>
  ),
};

export const CampoConError: Story = {
  render: () => (
    <Field label="Importe (€)" htmlFor="imp" error="El importe debe ser mayor que 0" className="max-w-sm">
      <Input id="imp" type="number" defaultValue={0} />
    </Field>
  ),
};

export const Formulario: Story = {
  render: () => (
    <div className="max-w-sm space-y-4">
      <Field label="Concepto" htmlFor="c">
        <Input id="c" placeholder="Préstamo" />
      </Field>
      <Field label="Tipo" htmlFor="tipo">
        <Select id="tipo" defaultValue="deuda">
          <option value="deuda">Deuda (resta)</option>
          <option value="pago">Pago (suma)</option>
        </Select>
      </Field>
      <Field label="Notas" htmlFor="n">
        <Textarea id="n" placeholder="Detalle opcional…" />
      </Field>
    </div>
  ),
};
