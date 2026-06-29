// apps/game/src/components/AccountView.disclosure.test.tsx
//
// Howey-guard: the "Cumulative Rewards / AGNTC Earned" panel must carry the
// co-located testnet-token disclosure (snippet #1) — a value figure ("AGNTC
// Earned") may never appear on a public surface without the valueless-token
// caveat travelling with it.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useGameStore } from "@/store";

// AccountView fetches chain data on mount (useEffect) when chainMode === 'testnet'.
// Provide full, non-crashing shapes for every call the effect makes.
vi.mock("@/services/testnetApi", () => ({
  getRewards: vi.fn().mockResolvedValue({
    wallet_index: 0,
    agntc_earned: 1.234567,
    dev_points: 2.5,
    research_points: 3.5,
    storage_units: 0,
    secured_chains: 4,
  }),
  getStaking: vi.fn().mockResolvedValue(null),
  getSecuringStatus: vi
    .fn()
    .mockResolvedValue({ active_positions: [], completed_positions: [] }),
  getVesting: vi.fn().mockResolvedValue(null),
  getSettings: vi.fn().mockResolvedValue(null),
  setOwnerName: vi.fn().mockResolvedValue({ name: "tester" }),
  getOwnerName: vi.fn().mockResolvedValue({ name: "tester" }),
}));

vi.mock("@/lib/walletIndex", () => ({
  getWalletIndex: vi.fn().mockReturnValue(0),
}));

describe("AccountView rewards-panel disclosure (Howey-guard)", () => {
  let AccountView: typeof import("./AccountView").default;

  beforeEach(async () => {
    useGameStore.getState().reset();
    useGameStore.setState({ chainMode: "testnet" });
    const mod = await import("./AccountView");
    AccountView = mod.default;
  });

  it("renders the testnet-token disclosure adjacent to Cumulative Rewards", async () => {
    render(<AccountView />);

    // The rewards panel renders once the chain promise resolves.
    expect(await screen.findByText("Cumulative Rewards")).toBeInTheDocument();
    expect(screen.getByText("AGNTC Earned")).toBeInTheDocument();

    // Disclosure #1 (DISCLOSURES.testnetToken) is co-located with the value figure.
    await waitFor(() => {
      expect(
        screen.getByText(/valueless token with no market price/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/earned through work/i)).toBeInTheDocument();
  });
});
