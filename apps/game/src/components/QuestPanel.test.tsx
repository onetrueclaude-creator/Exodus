import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useGameStore } from "@/store";
import QuestPanel from "./QuestPanel";

beforeEach(() => {
  useGameStore.getState().reset();
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => ({
      currentStreak: 3,
      quests: [
        { key: "daily_check_in", cadence: "DAILY", title: "Daily check-in", description: "d", baseScore: 1, protocolValuable: false, completedThisWindow: false },
        { key: "weekly_secure", cadence: "WEEKLY", title: "Secure a block cycle", description: "w", baseScore: 5, protocolValuable: true, completedThisWindow: false },
      ],
    }),
  })));
});

describe("QuestPanel", () => {
  it("renders nothing unless the quests dock panel is active", () => {
    useGameStore.setState({ activeDockPanel: null });
    const { container } = render(<QuestPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lists the three cadences and the testnet valueless disclaimer when active", async () => {
    useGameStore.setState({ activeDockPanel: "quests" });
    render(<QuestPanel />);
    await waitFor(() => expect(screen.getByText(/Secure a block cycle/)).toBeInTheDocument());
    expect(screen.getAllByText(/daily/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/weekly/i).length).toBeGreaterThan(0);
    // disclosure snippet #1 co-located with the earning surface
    expect(screen.getByText(/valueless token/i)).toBeInTheDocument();
  });

  it("shows Do button for engagement quests but NOT for protocol-valuable quests", async () => {
    useGameStore.setState({ activeDockPanel: "quests" });
    render(<QuestPanel />);
    await waitFor(() => expect(screen.getByText(/Secure a block cycle/)).toBeInTheDocument());

    // engagement quest (daily_check_in, protocolValuable: false) → Do button present
    expect(screen.getByRole("button", { name: /do/i })).toBeInTheDocument();

    // protocol-valuable quest (weekly_secure, protocolValuable: true) → no Do button for that quest
    // The auto-indicator should be present instead
    expect(screen.getByTitle(/awarded automatically/i)).toBeInTheDocument();

    // Only one Do button total (only the engagement quest has one)
    expect(screen.getAllByRole("button", { name: /do/i })).toHaveLength(1);
  });
});
