import type { Preview, Decorator } from "@storybook/nextjs-vite";
import { INITIAL_VIEWPORTS } from "storybook/viewport";
import "../src/app/globals.css";

// Aplica el tema seleccionado en la toolbar añadiendo la clase `.dark` al canvas
// (lo mismo que hace next-themes en la app → activa los tokens de globals.css).
const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme ?? "light";
  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="bg-background text-foreground min-h-[60vh] p-6">
        <Story />
      </div>
    </div>
  );
};

const preview: Preview = {
  parameters: {
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    a11y: { test: "todo" },
    // App Router: monta el mock de router de Storybook para que los componentes
    // que usan `useRouter`/`usePathname` (next/navigation) rendericen sin el
    // invariant "expected app router to be mounted". Las stories pueden afinar
    // `nextjs.navigation.pathname` por encima de esto.
    nextjs: { appDirectory: true },
    // Registra los viewports de dispositivo; una story selecciona el suyo con
    // `globals.viewport.value` (p. ej. MobileNav usa un viewport móvil).
    viewport: { options: INITIAL_VIEWPORTS },
  },
  initialGlobals: { theme: "light" },
  globalTypes: {
    theme: {
      description: "Tema de color (light / dark)",
      toolbar: {
        title: "Tema",
        icon: "contrast",
        items: [
          { value: "light", title: "Light", icon: "sun" },
          { value: "dark", title: "Dark", icon: "moon" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [withTheme],
};

export default preview;
