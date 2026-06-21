// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const syncFinanzasAction = vi.fn();
const refresh = vi.fn();
vi.mock("@/lib/actions/finanzas", () => ({
  syncFinanzasAction: (...args: unknown[]) => syncFinanzasAction(...args),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { SyncButton } from "@/components/finanzas/sync-button";

beforeEach(() => {
  syncFinanzasAction.mockReset();
  refresh.mockReset();
});

describe("SyncButton", () => {
  it("sincroniza y muestra el resultado, refrescando la vista", async () => {
    syncFinanzasAction.mockResolvedValue({ ok: true, movimientos: 3, deudas: 2, at: "2026-06-21T10:00:00Z" });
    render(<SyncButton lastSync={null} />);

    fireEvent.click(screen.getByRole("button", { name: /sincronizar/i }));
    await waitFor(() =>
      expect(screen.getByText(/3 movimientos, 2 deudas/i)).toBeInTheDocument(),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("muestra el error si el sync falla", async () => {
    syncFinanzasAction.mockResolvedValue({ ok: false, error: "Falta NOTION_API_KEY" });
    render(<SyncButton lastSync={null} />);
    fireEvent.click(screen.getByRole("button", { name: /sincronizar/i }));
    await waitFor(() => expect(screen.getByText(/Falta NOTION_API_KEY/i)).toBeInTheDocument());
    expect(refresh).not.toHaveBeenCalled();
  });
});
