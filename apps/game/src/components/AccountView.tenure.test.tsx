/**
 * DePIN S3b — AccountView Tenure card: epochs + √-rank-weight, and per-node
 * level-up gate badges (locked/unlocked/—) driven by the folded tenure status.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AccountView from "@/components/AccountView";
import { useGameStore } from "@/store";

// Chain reads in AccountView's mount effect — stub them to resolve empty.
vi.mock("@/services/testnetApi", () => ({
  getRewards: vi.fn().mockResolvedValue(null),
  getStaking: vi.fn().mockResolvedValue(null),
  getSecuringStatus: vi.fn().mockResolvedValue(null),
  getVesting: vi.fn().mockResolvedValue(null),
  getSettings: vi.fn().mockResolvedValue(null),
  setOwnerName: vi.fn(),
  getOwnerName: vi.fn().mockResolvedValue({ name: "" }),
}));

const INITIAL = useGameStore.getState();
const agent = (over = {}) => ({ id: "a1", userId: "me", username: "Neo", level: 1, position: { x: 0, y: 0 }, miningCpu: 0, securingCpu: 0, levelingUntilTurn: null, isPrimary: true, planets: [], createdAt: 0, borderRadius: 30, borderPressure: 0, cpuPerTurn: 0, miningRate: 0, energyLimit: 0, stakedCpu: 0, ...over });

describe("AccountView — Tenure card + gate badges", () => {
  beforeEach(() => {
    useGameStore.setState({ ...INITIAL, chainMode: "testnet", currentUserId: "me", agents: { a1: agent() } as never }, true);
  });

  it("shows epochs of service + √ rank weight when synced", async () => {
    useGameStore.setState({ timeStatus: { walletIndex: 1, ownerHex: "ab".repeat(32), timeAccrued: 6, influence: Math.sqrt(6), updatedAtBlock: 9 } });
    render(<AccountView />);
    await screen.findByText("Tenure");
    expect(screen.getByText("Epochs of Service")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText(Math.sqrt(6).toFixed(2))).toBeInTheDocument();
  });

  it("gate badge is 'locked' below T(2)=2 and 'unlocked' at/above it", async () => {
    useGameStore.setState({ timeStatus: { walletIndex: 1, ownerHex: "ab".repeat(32), timeAccrued: 1, influence: 1, updatedAtBlock: 9 } });
    const { rerender } = render(<AccountView />);
    await screen.findByText("Tenure");
    expect(screen.getByText("locked")).toBeInTheDocument(); // L1→L2 needs 2, have 1

    useGameStore.setState({ timeStatus: { walletIndex: 1, ownerHex: "ab".repeat(32), timeAccrued: 2, influence: Math.sqrt(2), updatedAtBlock: 9 } });
    rerender(<AccountView />);
    expect(screen.getByText("unlocked")).toBeInTheDocument();
  });

  it("gate badge shows a dash when tenure is unknown (null-honest)", async () => {
    useGameStore.setState({ timeStatus: null });
    render(<AccountView />);
    await screen.findByText("Tenure");
    // The badge column renders "—" for unknown; the "LEVEL-UP GATES" heading is present.
    expect(screen.getByText("LEVEL-UP GATES")).toBeInTheDocument();
    // Null-honesty discriminator: with tenure unknown, NO fabricated pass/fail
    // badge may render anywhere. (queryByText matches exact full text content,
    // so "unlocked" does not collide with "locked".)
    expect(screen.queryByText("locked")).toBeNull();
    expect(screen.queryByText("unlocked")).toBeNull();
  });
});
