import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { DashboardHeader } from "./dashboard-header";

/**
 * Header del dashboard con la nav-píldora (desktop). Resalta la sección activa
 * según la ruta. En móvil la navegación vive en la bottom bar (MobileNav).
 */
const meta = {
  title: "Layout/DashboardHeader",
  component: DashboardHeader,
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true, navigation: { pathname: "/finanzas" } },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
} satisfies Meta<typeof DashboardHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Finanzas: Story = {};

export const Inicio: Story = {
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: "/" } } },
};
