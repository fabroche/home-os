// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const signOut = vi.fn().mockResolvedValue({});
vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { signOut } }),
}));

import { LogoutButton } from "@/components/layout/logout-button";

beforeEach(() => {
  signOut.mockClear();
  // Evita el "Not implemented: navigation" de jsdom al redirigir.
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { assign: vi.fn() },
  });
});

describe("LogoutButton", () => {
  it("cierra la sesión al pulsar", async () => {
    render(<LogoutButton />);
    fireEvent.click(screen.getByRole("button", { name: /salir/i }));
    await waitFor(() => expect(signOut).toHaveBeenCalledOnce());
  });
});
