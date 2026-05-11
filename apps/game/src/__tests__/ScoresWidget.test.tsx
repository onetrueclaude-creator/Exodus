/**
 * ScoresWidget.test.tsx
 *
 * Tests the floating Scores widget that displays Secured + Mined chains
 * in the upper-right corner of the game viewport.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useGameStore } from "@/store";
import ScoresWidget from "@/components/ScoresWidget";

describe("ScoresWidget", () => {
  beforeEach(() => {
    useGameStore.setState({
      chainMode: "testnet",
      securedChains: 0,
      minedChains: 0,
      resourceDeltas: {},
    });
  });

  it("renders both score rows with values when chain is on testnet", () => {
    useGameStore.setState({ securedChains: 12, minedChains: 5 });
    render(<ScoresWidget />);

    expect(screen.getByText("SCORES")).toBeInTheDocument();
    expect(screen.getByText("Secured")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Mined")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("returns null when chainMode is mock (offline)", () => {
    useGameStore.setState({ chainMode: "mock" });
    const { container } = render(<ScoresWidget />);
    expect(container.firstChild).toBeNull();
  });

  it("shows DeltaFlash when securedChains delta is set", () => {
    useGameStore.setState({
      resourceDeltas: { securedChains: { value: 1, ts: Date.now() } },
    });
    render(<ScoresWidget />);
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("shows DeltaFlash when minedChains delta is set", () => {
    useGameStore.setState({
      resourceDeltas: { minedChains: { value: 1, ts: Date.now() } },
    });
    render(<ScoresWidget />);
    expect(screen.getByText("+1")).toBeInTheDocument();
  });
});
