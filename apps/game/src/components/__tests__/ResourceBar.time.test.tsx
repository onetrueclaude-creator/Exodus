/**
 * DePIN S3b — HUD Time chip: null-honest dash when unsynced, epochs when synced.
 * @solana/wallet-adapter-react is mocked (ResourceBar calls useWallet()).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ResourceBar from "@/components/ResourceBar";
import { useGameStore } from "@/store";

vi.mock("@solana/wallet-adapter-react", () => ({ useWallet: () => ({ publicKey: null }) }));

const INITIAL = useGameStore.getState();

describe("ResourceBar — Time chip", () => {
  beforeEach(() => {
    useGameStore.setState({ ...INITIAL, chainMode: "testnet" }, true);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  });

  it("renders a dash when tenure is unsynced (null) — no fabricated 0", () => {
    useGameStore.setState({ timeStatus: null });
    render(<ResourceBar />);
    const chip = screen.getByTestId("time-hud");
    expect(chip.textContent).toContain("—");
    expect(chip.textContent).toContain("ep");
  });

  it("renders epochs + √-influence when synced", () => {
    useGameStore.setState({ timeStatus: { walletIndex: 1, ownerHex: "ab".repeat(32), timeAccrued: 6, influence: Math.sqrt(6), updatedAtBlock: 9 } });
    render(<ResourceBar />);
    const chip = screen.getByTestId("time-hud");
    expect(chip.textContent).toContain("6");
    expect(chip.textContent).toContain(`√${Math.sqrt(6).toFixed(1)}`);
  });

  it("renders a genuine 0 (not the unsynced dash) when a synced row reports zero epochs", () => {
    // Constraint-2 distinction: null = unknown (dash) vs a REAL zero from a
    // successful sync (honest 0). A truthiness regression (`timeStatus.timeAccrued
    // ? ... : "—"`) would collapse the two — this pins them apart.
    useGameStore.setState({ timeStatus: { walletIndex: 1, ownerHex: "ab".repeat(32), timeAccrued: 0, influence: 0, updatedAtBlock: 9 } });
    render(<ResourceBar />);
    const chip = screen.getByTestId("time-hud");
    expect(chip.textContent).toContain("0");
    expect(chip.textContent).toContain("ep");
    expect(chip.textContent).not.toContain("—");
  });
});
