// apps/game/src/components/AccountView.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useGameStore } from "@/store";

// ── Module mocks ───────────────────────────────────────────────────────────
// AccountView calls testnetApi functions on mount (useEffect); stub them so
// jsdom tests don't make real network calls.
vi.mock("@/services/testnetApi", () => ({
  getRewards: vi.fn().mockResolvedValue({}),
  getStaking: vi.fn().mockResolvedValue({}),
  getSecuringStatus: vi.fn().mockResolvedValue({ active_positions: [], completed_positions: [] }),
  getVesting: vi.fn().mockResolvedValue(null),
  getSettings: vi.fn().mockResolvedValue({}),
  setOwnerName: vi.fn().mockResolvedValue({ name: "test" }),
  getOwnerName: vi.fn().mockResolvedValue({ name: "test" }),
}));

vi.mock("@/lib/walletIndex", () => ({
  getWalletIndex: vi.fn().mockReturnValue(0),
}));

// ── Test suite ─────────────────────────────────────────────────────────────

describe("AccountView tier change (D)", () => {
  let AccountView: typeof import("./AccountView").default;

  beforeEach(async () => {
    useGameStore.getState().reset();
    // Default fetch stub: POST /api/tier succeeds; GET /api/me returns minimal shape
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/tier") {
          return {
            ok: true,
            json: async () => ({ subscription: "PROFESSIONAL", tier: "professional" }),
          };
        }
        // /api/me — fire-and-forget refetch stub
        return { ok: true, json: async () => ({}) };
      }),
    );
    const mod = await import("./AccountView");
    AccountView = mod.default;
  });

  it("shows the current tier + an Upgrade-to-Professional action when community", () => {
    useGameStore.setState({ currentUserTier: "community" });
    render(<AccountView />);
    expect(
      screen.getByRole("button", { name: /upgrade to professional/i }),
    ).toBeInTheDocument();
  });

  it("upgrading POSTs /api/tier and updates the store tier (no re-seed of energy)", async () => {
    useGameStore.setState({ currentUserTier: "community", energy: 1234 });
    render(<AccountView />);

    fireEvent.click(screen.getByRole("button", { name: /upgrade to professional/i }));

    // If there is a confirm step, click confirm too
    const confirm = screen.queryByRole("button", { name: /confirm/i });
    if (confirm) fireEvent.click(confirm);

    await waitFor(() => {
      expect(
        (globalThis.fetch as ReturnType<typeof vi.fn>),
      ).toHaveBeenCalledWith(
        "/api/tier",
        expect.objectContaining({ method: "POST" }),
      );
      expect(useGameStore.getState().currentUserTier).toBe("professional");
      expect(useGameStore.getState().energy).toBe(1234); // progress kept — no re-seed
    });
  });

  it("shows Downgrade-to-Community when professional", () => {
    useGameStore.setState({ currentUserTier: "professional" });
    render(<AccountView />);
    expect(
      screen.getByRole("button", { name: /downgrade to community/i }),
    ).toBeInTheDocument();
  });

  it("hides the subscription toggle for founder (role axis, not a player tier)", () => {
    useGameStore.setState({ currentUserTier: "founder" });
    render(<AccountView />);
    expect(
      screen.queryByRole("button", { name: /upgrade to professional/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /downgrade to community/i }),
    ).not.toBeInTheDocument();
  });
});
