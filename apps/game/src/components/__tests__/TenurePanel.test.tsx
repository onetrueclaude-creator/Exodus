/**
 * DePIN S3b — Tenure Leaderboard: both numbers (epochs + √-influence), username
 * join from the agent window, truncated-hex fallback, own-row highlight, the
 * null-honest "unavailable" failure path (asserted POST-rejection, so a
 * fabricated-empty-board regression fails), and the distinct loaded-but-empty
 * board state.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import TenurePanel from "@/components/TenurePanel";
import { useGameStore } from "@/store";
import type { ChainService } from "@/services/chainService";
import type { LeaderboardRow } from "@/lib/timeLedger";

const INITIAL = useGameStore.getState();
const OWNER_ME = "ab".repeat(32);
const OWNER_KNOWN = "cd".repeat(32);
const OWNER_UNKNOWN = "ef".repeat(32);

function stubChain(board: LeaderboardRow[]): ChainService {
  return { getTimeLeaderboard: vi.fn().mockResolvedValue(board) } as unknown as ChainService;
}

describe("TenurePanel", () => {
  beforeEach(() => {
    useGameStore.setState(
      {
        ...INITIAL,
        activeDockPanel: "tenure",
        // My own row: ownerHex from the folded tenure status.
        timeStatus: { walletIndex: 1, ownerHex: OWNER_ME, timeAccrued: 6, influence: Math.sqrt(6), updatedAtBlock: 9 },
        // Agent window carries chain-resolved usernames keyed by owner_hex (=userId).
        agents: {
          me: { id: "me", userId: OWNER_ME, username: "Neo", level: 1, position: { x: 0, y: 0 }, miningCpu: 0, securingCpu: 0, levelingUntilTurn: null, isPrimary: true, planets: [], createdAt: 0, borderRadius: 30, borderPressure: 0, cpuPerTurn: 0, miningRate: 0, energyLimit: 0, stakedCpu: 0 },
          k: { id: "k", userId: OWNER_KNOWN, username: "Trinity", level: 1, position: { x: 0, y: 0 }, miningCpu: 0, securingCpu: 0, levelingUntilTurn: null, isPrimary: false, planets: [], createdAt: 0, borderRadius: 30, borderPressure: 0, cpuPerTurn: 0, miningRate: 0, energyLimit: 0, stakedCpu: 0 },
        } as never,
      },
      true,
    );
  });

  it("renders BOTH numbers, joins usernames, truncates unknown owners, highlights own row", async () => {
    const board: LeaderboardRow[] = [
      { ownerHex: OWNER_KNOWN, timeAccrued: 12, influence: Math.sqrt(12) },
      { ownerHex: OWNER_ME, timeAccrued: 6, influence: Math.sqrt(6) },
      { ownerHex: OWNER_UNKNOWN, timeAccrued: 2, influence: Math.sqrt(2) },
    ];
    render(<TenurePanel chainService={stubChain(board)} />);

    // Username join
    await screen.findByText("Trinity");
    // Own row: joined name + "(you)" marker + self testid
    expect(screen.getByText(/Neo \(you\)/)).toBeInTheDocument();
    expect(screen.getByTestId("tenure-row-self")).toBeInTheDocument();
    // Truncated-hex fallback for the unknown owner
    expect(screen.getByText("efefef…efef")).toBeInTheDocument();
    // BOTH numbers present: raw epochs AND √-influence
    expect(screen.getByText("12 ep")).toBeInTheDocument();
    expect(screen.getByText(`√${Math.sqrt(12).toFixed(2)}`)).toBeInTheDocument();
  });

  it("shows null-honest 'unavailable' when the board never loads", async () => {
    const getTimeLeaderboard = vi.fn().mockRejectedValue(new Error("offline"));
    const failing = { getTimeLeaderboard } as unknown as ChainService;
    render(<TenurePanel chainService={failing} />);
    // Frame 0 already shows "unavailable" (rows === null on mount), so waiting on
    // that text alone observes nothing. Anchor on the fetch having fired, then
    // flush the mocked rejection's microtask deterministically...
    await waitFor(() => expect(getTimeLeaderboard).toHaveBeenCalled());
    await act(async () => { await Promise.resolve(); });
    // ...and assert BOTH sides of the null-honest distinction: still
    // "unavailable", and NO fabricated empty board (a `catch { setRows([]) }`
    // regression must fail here).
    expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/No service history/i)).not.toBeInTheDocument();
  });

  it("renders a loaded-but-empty board as 'no history yet', not 'unavailable'", async () => {
    render(<TenurePanel chainService={stubChain([])} />);
    // Settles only when rows = [] lands — frame 0 shows "unavailable" while null.
    await waitFor(() =>
      expect(screen.getByText(/No service history recorded yet/i)).toBeInTheDocument(),
    );
    expect(screen.queryByText(/unavailable/i)).not.toBeInTheDocument();
  });
});
