/**
 * ResourceBar Disk HUD — the DePIN Disk resource surface.
 * Store-driven (vaultPinStats); null renders as an honest dash (never
 * fabricated zeros). The canonical valueless-testnet disclosure renders as
 * VISIBLE DOM text (not a hover-only tooltip) adjacent to the Disk numbers —
 * per the S2 controller resolution (2026-07-02): hover-only `title=`
 * disclosures are below-bar (invisible by default, dead on touch). Same
 * verbatim string + precedent as AccountView's Cumulative Rewards disclosure
 * (see AccountView.tsx, AccountView.disclosure.test.tsx). Copy is factual
 * only — no value/yield language.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { useGameStore } from "@/store";
import { DISCLOSURES } from "@/lib/disclosures";

// Project convention (apps/game/CLAUDE.md): ResourceBar calls useWallet()
// unconditionally — mock the adapter in any test that renders it.
vi.mock("@solana/wallet-adapter-react", () => ({
  useWallet: () => ({ publicKey: null }),
}));

import ResourceBar from "@/components/ResourceBar";

describe("ResourceBar — Disk HUD", () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    // The /api/me identity probe: settle quietly as a hollow user.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({}) }));
  });

  it("shows a dash before any pin sync (never fake zeros)", () => {
    render(<ResourceBar />);
    const disk = screen.getByTestId("disk-hud");
    expect(within(disk).getByText("—")).toBeInTheDocument();
    expect(within(disk).getByText("Disk")).toBeInTheDocument();
    expect(within(disk).queryByText(/audits passed/)).toBeNull();
  });

  it("shows pinned MiB + audit pass-rate after a chain sync", () => {
    useGameStore
      .getState()
      .setVaultPinStats({ pinnedBytes: 8_388_608, passRate: 0.97, activePins: 2 });
    render(<ResourceBar />);
    const disk = screen.getByTestId("disk-hud");
    expect(within(disk).getByText("8.0 MiB")).toBeInTheDocument();
    expect(within(disk).getByText("97% audits passed")).toBeInTheDocument();
  });

  it("renders the canonical valueless-testnet disclosure as visible DOM text, not a tooltip", () => {
    render(<ResourceBar />);
    // chainMode defaults to "mock" in reset state — the disclosure strip is
    // unconditional (not gated on chain mode or pin-sync state), and must be
    // reachable as real rendered text, never only a `title=` attribute value.
    const disclosure = screen.getByTestId("disk-disclosure");
    expect(disclosure).toHaveTextContent(DISCLOSURES.testnetToken);
    // Belt-and-suspenders: getByText only ever matches rendered text nodes,
    // never attribute values — this fails if the string regresses to title-only.
    expect(screen.getByText(DISCLOSURES.testnetToken)).toBeInTheDocument();
    expect(screen.getByTestId("disk-hud")).toHaveAttribute("title", DISCLOSURES.testnetToken);
  });

  it("never uses value/yield language in the Disk copy", () => {
    useGameStore
      .getState()
      .setVaultPinStats({ pinnedBytes: 8_388_608, passRate: 0.97, activePins: 2 });
    render(<ResourceBar />);
    const disk = screen.getByTestId("disk-hud");
    expect(within(disk).queryByText(/earn|yield|reward|profit|apy|income/i)).toBeNull();
  });
});
