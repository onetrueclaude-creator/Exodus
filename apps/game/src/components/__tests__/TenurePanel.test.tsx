/**
 * DePIN S3b — Tenure Leaderboard: both numbers (epochs + √-influence), username
 * join from the agent window, truncated-hex fallback, own-row highlight, and
 * null-honest "unavailable" when the board never loads.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
    const failing = { getTimeLeaderboard: vi.fn().mockRejectedValue(new Error("offline")) } as unknown as ChainService;
    render(<TenurePanel chainService={failing} />);
    await waitFor(() => expect(screen.getByText(/unavailable/i)).toBeInTheDocument());
  });
});
