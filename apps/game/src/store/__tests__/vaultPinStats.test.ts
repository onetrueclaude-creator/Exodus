/**
 * Disk resource store slice — vaultPinStats holds the folded pins surface
 * (null = never synced / offline → the HUD renders a dash, not fake zeros).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "@/store";

describe("gameStore — vaultPinStats (Disk resource)", () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it("defaults to null (never synced)", () => {
    expect(useGameStore.getState().vaultPinStats).toBeNull();
  });

  it("setVaultPinStats stores the folded stats absolutely (chain truth)", () => {
    useGameStore
      .getState()
      .setVaultPinStats({ pinnedBytes: 4_194_304, passRate: 0.9, activePins: 1 });
    expect(useGameStore.getState().vaultPinStats).toEqual({
      pinnedBytes: 4_194_304,
      passRate: 0.9,
      activePins: 1,
    });
  });

  it("setVaultPinStats(null) and reset() both clear back to unsynced", () => {
    useGameStore.getState().setVaultPinStats({ pinnedBytes: 1, passRate: 1, activePins: 1 });
    useGameStore.getState().setVaultPinStats(null);
    expect(useGameStore.getState().vaultPinStats).toBeNull();

    useGameStore.getState().setVaultPinStats({ pinnedBytes: 1, passRate: 1, activePins: 1 });
    useGameStore.getState().reset();
    expect(useGameStore.getState().vaultPinStats).toBeNull();
  });
});
