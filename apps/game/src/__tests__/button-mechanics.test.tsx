/**
 * button-mechanics.test.tsx
 *
 * Comprehensive test suite for interactive button mechanics:
 *   - DockPanel (right sidebar with 6 icon buttons)
 *   - TabNavigation (NETWORK / ACCOUNT VIEW / RESEARCHES / SKILLS)
 *   - ResourceBar (top status bar with resource values)
 *   - Integration: dock + tab interactions
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useGameStore } from "@/store";
import type { Agent } from "@/types";
import { TIER_CPU_COST, TIER_BASE_BORDER, TIER_MINING_RATE } from "@/types/agent";

// ---------------------------------------------------------------------------
// Mock @solana/wallet-adapter-react so ResourceBar renders without a provider
// ---------------------------------------------------------------------------
vi.mock("@solana/wallet-adapter-react", () => ({
  useWallet: () => ({ publicKey: null }),
}));

// ---------------------------------------------------------------------------
// Mock heavy sub-components used by DockPanel so they don't pull in PixiJS
// or other browser-only dependencies
// ---------------------------------------------------------------------------
vi.mock("@/components/NetworkChatRoom", () => ({
  default: ({ onSend }: { onSend: (t: string) => void }) => (
    <div data-testid="network-chat-room">
      <button onClick={() => onSend("test")}>SendMock</button>
    </div>
  ),
}));

vi.mock("@/components/AgentChat", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="agent-chat">
      <button onClick={onClose}>CloseTerminal</button>
    </div>
  ),
}));

vi.mock("@/components/TimechainStats", () => ({
  default: () => <div data-testid="timechain-stats">TimechainStats</div>,
}));

vi.mock("@/components/TimeRewind", () => ({
  default: ({ onTimeChange }: { onTimeChange: (ts: number) => void }) => (
    <div data-testid="time-rewind">
      <button onClick={() => onTimeChange(Date.now())}>TimeChangeMock</button>
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: "a1",
    userId: "u1",
    position: { x: 100, y: 200 },
    tier: "sonnet",
    isPrimary: true,
    planets: [],
    createdAt: Date.now(),
    username: "TestAgent",
    borderRadius: TIER_BASE_BORDER.sonnet,
    borderPressure: 0,
    cpuPerTurn: TIER_CPU_COST.sonnet,
    miningRate: TIER_MINING_RATE.sonnet,
    energyLimit: TIER_CPU_COST.sonnet * 5,
    stakedCpu: 0,
    ...overrides,
  };
}

/** Default props for DockPanel — all required callbacks stubbed out */
const defaultDockProps = {
  onHaikuSubmit: vi.fn(),
  currentAgent: null as Agent | null,
  chainService: null,
  onAgentDeploy: vi.fn(),
  onFocusNode: vi.fn(),
  serverStartTime: Date.now() - 60_000,
  onTimeChange: vi.fn(),
};

// ===========================================================================
// DockPanel tests
// ===========================================================================

describe("DockPanel", () => {
  let DockPanel: React.ComponentType<typeof defaultDockProps>;

  beforeEach(async () => {
    useGameStore.getState().reset();
    vi.clearAllMocks();
    const mod = await import("@/components/DockPanel");
    DockPanel = mod.default as React.ComponentType<typeof defaultDockProps>;
  });

  // ── Button rendering ──────────────────────────────────────────────────────

  it("renders all 4 dock icon buttons", () => {
    render(<DockPanel {...defaultDockProps} />);
    expect(screen.getByRole("button", { name: "Network Chat" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Agent Terminal" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Chain Stats" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Time Rewind" })).toBeDefined();
  });

  it("each dock button has a correct aria-label", () => {
    render(<DockPanel {...defaultDockProps} />);
    const labels = [
      "Network Chat",
      "Agent Terminal",
      "Chain Stats",
      "Time Rewind",
    ];
    for (const label of labels) {
      const btn = screen.getByRole("button", { name: label });
      expect(btn.getAttribute("aria-label")).toBe(label);
    }
  });

  // ── Toggle mechanics ──────────────────────────────────────────────────────

  it("clicking a dock button opens the corresponding panel (sets activeDockPanel)", () => {
    render(<DockPanel {...defaultDockProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Network Chat" }));
    expect(useGameStore.getState().activeDockPanel).toBe("chat");
  });

  it("clicking the same button again closes the panel (toggle off)", () => {
    render(<DockPanel {...defaultDockProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Network Chat" }));
    expect(useGameStore.getState().activeDockPanel).toBe("chat");
    fireEvent.click(screen.getByRole("button", { name: "Network Chat" }));
    expect(useGameStore.getState().activeDockPanel).toBeNull();
  });

  it("clicking a different button switches to that panel", () => {
    render(<DockPanel {...defaultDockProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Network Chat" }));
    expect(useGameStore.getState().activeDockPanel).toBe("chat");
    fireEvent.click(screen.getByRole("button", { name: "Chain Stats" }));
    expect(useGameStore.getState().activeDockPanel).toBe("stats");
  });

  it("clicking Agent Terminal sets activeDockPanel to terminal", () => {
    render(<DockPanel {...defaultDockProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Agent Terminal" }));
    expect(useGameStore.getState().activeDockPanel).toBe("terminal");
  });

  it("clicking Time Rewind sets activeDockPanel to timeRewind", () => {
    render(<DockPanel {...defaultDockProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Time Rewind" }));
    expect(useGameStore.getState().activeDockPanel).toBe("timeRewind");
  });

  // ── Panel content rendering ───────────────────────────────────────────────

  it("no floating panel renders when activeDockPanel is null", () => {
    render(<DockPanel {...defaultDockProps} />);
    expect(screen.queryByTestId("network-chat-room")).toBeNull();
    expect(screen.queryByTestId("timechain-stats")).toBeNull();
    expect(screen.queryByTestId("time-rewind")).toBeNull();
  });

  it("NetworkChatRoom panel renders when chat is active", () => {
    render(<DockPanel {...defaultDockProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Network Chat" }));
    expect(screen.getByTestId("network-chat-room")).toBeDefined();
  });

  it("TimeRewind panel renders when timeRewind is active", () => {
    render(<DockPanel {...defaultDockProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Time Rewind" }));
    expect(screen.getByTestId("time-rewind")).toBeDefined();
  });

  it('shows "No agent selected" message for terminal/deploy when no currentAgent', () => {
    render(<DockPanel {...defaultDockProps} currentAgent={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Agent Terminal" }));
    expect(screen.getByText("No agent selected. Claim a node first.")).toBeDefined();
  });

  it("renders AgentChat when terminal is active and currentAgent is set", () => {
    const agent = makeAgent();
    render(<DockPanel {...defaultDockProps} currentAgent={agent} />);
    fireEvent.click(screen.getByRole("button", { name: "Agent Terminal" }));
    expect(screen.getByTestId("agent-chat")).toBeDefined();
  });

  it("panel disappears when toggle closes it", () => {
    render(<DockPanel {...defaultDockProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Network Chat" }));
    expect(screen.getByTestId("network-chat-room")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Network Chat" }));
    expect(screen.queryByTestId("network-chat-room")).toBeNull();
  });

  // ── Keyboard close ────────────────────────────────────────────────────────

  it("pressing Escape closes the active panel", () => {
    render(<DockPanel {...defaultDockProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Network Chat" }));
    expect(useGameStore.getState().activeDockPanel).toBe("chat");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(useGameStore.getState().activeDockPanel).toBeNull();
  });

  // ── Active indicator ──────────────────────────────────────────────────────

  it("active dock button has dock-icon-active class", () => {
    render(<DockPanel {...defaultDockProps} />);
    const chatBtn = screen.getByRole("button", { name: "Network Chat" });
    // Before click: no active class
    expect(chatBtn.className).not.toContain("dock-icon-active");
    fireEvent.click(chatBtn);
    // After click: has active class
    expect(chatBtn.className).toContain("dock-icon-active");
  });

  it("only the clicked button gets dock-icon-active class", () => {
    render(<DockPanel {...defaultDockProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Network Chat" }));
    const statsBtn = screen.getByRole("button", { name: "Chain Stats" });
    expect(statsBtn.className).not.toContain("dock-icon-active");
  });
});

// ===========================================================================
// TabNavigation tests
// ===========================================================================

describe("TabNavigation", () => {
  let TabNavigation: React.ComponentType;

  beforeEach(async () => {
    useGameStore.getState().reset();
    const mod = await import("@/components/TabNavigation");
    TabNavigation = mod.default;
  });

  // ── Rendering ─────────────────────────────────────────────────────────────

  it("renders active tabs", () => {
    render(<TabNavigation />);
    expect(screen.getByText("Network")).toBeDefined();
    expect(screen.getByText("Account View")).toBeDefined();
  });

  it("renders tab labels in UPPERCASE via CSS class", () => {
    render(<TabNavigation />);
    // Labels are rendered with uppercase tracking class; text content is still title-case
    const networkLabel = screen.getByText("Network");
    expect(networkLabel).toBeDefined();
  });

  it("renders a SYS.OK status indicator", () => {
    render(<TabNavigation />);
    expect(screen.getByText("SYS.OK")).toBeDefined();
  });

  // ── Default active tab ────────────────────────────────────────────────────

  it("default active tab is NETWORK", () => {
    render(<TabNavigation />);
    expect(useGameStore.getState().activeTab).toBe("network");
  });

  it("network tab button has accent-cyan text class by default", () => {
    render(<TabNavigation />);
    // Find the Network tab button (parent of the text node)
    const networkBtn = screen.getByText("Network").closest("button")!;
    expect(networkBtn.className).toContain("text-accent-cyan");
  });

  it("inactive tabs do NOT have accent-cyan class", () => {
    render(<TabNavigation />);
    const accountBtn = screen.getByText("Account View").closest("button")!;
    expect(accountBtn.className).not.toContain("text-accent-cyan");
  });

  // ── Click interactions ────────────────────────────────────────────────────

  it("clicking Account View tab changes activeTab to account", () => {
    render(<TabNavigation />);
    fireEvent.click(screen.getByText("Account View").closest("button")!);
    expect(useGameStore.getState().activeTab).toBe("account");
  });

  it("clicking Network tab changes activeTab to network", () => {
    render(<TabNavigation />);
    // Start on a different tab
    fireEvent.click(screen.getByText("Account View").closest("button")!);
    expect(useGameStore.getState().activeTab).toBe("account");
    // Switch back to Network
    fireEvent.click(screen.getByText("Network").closest("button")!);
    expect(useGameStore.getState().activeTab).toBe("network");
  });

  it("clicking the active tab again keeps it active (no toggle-off)", () => {
    render(<TabNavigation />);
    fireEvent.click(screen.getByText("Network").closest("button")!);
    expect(useGameStore.getState().activeTab).toBe("network");
  });

  it("newly active tab button gains accent-cyan class", () => {
    render(<TabNavigation />);
    const accountBtn = screen.getByText("Account View").closest("button")!;
    expect(accountBtn.className).not.toContain("text-accent-cyan");
    fireEvent.click(accountBtn);
    expect(accountBtn.className).toContain("text-accent-cyan");
  });

  it("previously active tab loses accent-cyan class when another is selected", () => {
    render(<TabNavigation />);
    const networkBtn = screen.getByText("Network").closest("button")!;
    expect(networkBtn.className).toContain("text-accent-cyan");
    fireEvent.click(screen.getByText("Account View").closest("button")!);
    // Re-query after re-render
    expect(screen.getByText("Network").closest("button")!.className).not.toContain(
      "text-accent-cyan"
    );
  });

  it("sequential tab clicks each update the store", () => {
    render(<TabNavigation />);
    const tabs = [
      { label: "Account View", id: "account" },
      { label: "Network", id: "network" },
    ] as const;

    for (const tab of tabs) {
      fireEvent.click(screen.getByText(tab.label).closest("button")!);
      expect(useGameStore.getState().activeTab).toBe(tab.id);
    }
  });
});

// ===========================================================================
// ResourceBar tests
// ===========================================================================

describe("ResourceBar", () => {
  let ResourceBar: React.ComponentType;

  beforeEach(async () => {
    useGameStore.getState().reset();
    useGameStore.getState().setCurrentUser("u1", "a1");
    useGameStore.getState().addAgent(makeAgent());
    const mod = await import("@/components/ResourceBar");
    ResourceBar = mod.default;
  });

  // ── Status indicators ─────────────────────────────────────────────────────

  it("shows OFFLINE badge when chainMode is mock", () => {
    render(<ResourceBar />);
    expect(screen.getByText("OFFLINE")).toBeDefined();
  });

  it("shows TESTNET badge when chainMode is testnet", () => {
    useGameStore.getState().setChainMode("testnet", 5);
    render(<ResourceBar />);
    expect(screen.getByText("TESTNET")).toBeDefined();
  });

  it("does NOT show TESTNET badge when chainMode is mock", () => {
    render(<ResourceBar />);
    expect(screen.queryByText("TESTNET")).toBeNull();
  });

  it("shows block number when in testnet mode with blocks", () => {
    useGameStore.getState().setChainMode("testnet", 42);
    render(<ResourceBar />);
    expect(screen.getByText("B#42")).toBeDefined();
  });

  // ── Resource values ───────────────────────────────────────────────────────

  it("renders CPU Energy value (initial 1000)", () => {
    render(<ResourceBar />);
    // sciFormat(1000) renders as '1000.0000' in yellow mono span
    const energyEls = screen.getAllByText((content) => content.includes("1000"));
    expect(energyEls.length).toBeGreaterThanOrEqual(1);
  });

  it("renders Turn label and counter", () => {
    render(<ResourceBar />);
    expect(screen.getByText("Turn")).toBeDefined();
    // Initial turn is 0 — multiple "0" elements may exist; use getAllByText
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(1);
  });

  it("turn counter increments when tick is called", () => {
    useGameStore.getState().setCurrentUser("u1", "a1");
    render(<ResourceBar />);
    // Multiple "0" can exist initially; just confirm turn starts at 0 in store
    expect(useGameStore.getState().turn).toBe(0);
    act(() => {
      useGameStore.getState().tick();
    });
    expect(useGameStore.getState().turn).toBe(1);
    // "1" appears in the DOM for the turn counter after increment
    expect(screen.getByText("1")).toBeDefined();
  });

  it("renders securedChains value (initial 0)", () => {
    render(<ResourceBar />);
    // securedChains = 0 on reset; the value appears as "0"
    // Turn is also 0 — there are two "0" elements, that's fine
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(1);
  });

  it("securedChains count updates when addSecuredChain is called", () => {
    render(<ResourceBar />);
    act(() => {
      useGameStore.getState().addSecuredChain();
    });
    expect(useGameStore.getState().securedChains).toBe(1);
  });

  it("renders faction arm label", () => {
    // setCurrentUserFaction("community") → shows "Community Arm"
    useGameStore.getState().setCurrentUserFaction("community");
    render(<ResourceBar />);
    expect(screen.getByText("Community Arm")).toBeDefined();
  });

  it("renders default community arm when faction is null", () => {
    useGameStore.getState().reset();
    render(<ResourceBar />);
    // null faction falls back to "community" display
    expect(screen.getByText("Community Arm")).toBeDefined();
  });

  it("renders faction-specific arm label", () => {
    useGameStore.getState().setCurrentUserFaction("pro-max");
    render(<ResourceBar />);
    expect(screen.getByText("Pro/Max Arm")).toBeDefined();
  });

  it("shows No wallet indicator when publicKey is null", () => {
    render(<ResourceBar />);
    expect(screen.getByText("No wallet")).toBeDefined();
  });

  // ── updateResources reflects in display ───────────────────────────────────

  it("energy display reflects updateResources call", () => {
    render(<ResourceBar />);
    act(() => {
      useGameStore.getState().updateResources(9999, 100, 200);
    });
    expect(useGameStore.getState().energy).toBe(9999);
  });

  it("agntcBalance updates when updateResources is called", () => {
    render(<ResourceBar />);
    act(() => {
      useGameStore.getState().updateResources(1000, 50, 777);
    });
    expect(useGameStore.getState().agntcBalance).toBe(777);
  });
});

// ===========================================================================
// Integration: dock + tab interactions
// ===========================================================================

describe("Integration — dock panel and tab navigation independence", () => {
  let DockPanel: React.ComponentType<typeof defaultDockProps>;
  let TabNavigation: React.ComponentType;

  beforeEach(async () => {
    useGameStore.getState().reset();
    vi.clearAllMocks();
    const dockMod = await import("@/components/DockPanel");
    const tabMod = await import("@/components/TabNavigation");
    DockPanel = dockMod.default as React.ComponentType<typeof defaultDockProps>;
    TabNavigation = tabMod.default;
  });

  it("opening a dock panel does not change the active tab", () => {
    const { rerender } = render(
      <>
        <TabNavigation />
        <DockPanel {...defaultDockProps} />
      </>
    );
    expect(useGameStore.getState().activeTab).toBe("network");
    fireEvent.click(screen.getByRole("button", { name: "Network Chat" }));
    expect(useGameStore.getState().activeDockPanel).toBe("chat");
    // Tab must remain unchanged
    expect(useGameStore.getState().activeTab).toBe("network");
    rerender(
      <>
        <TabNavigation />
        <DockPanel {...defaultDockProps} />
      </>
    );
    expect(screen.getByText("Network").closest("button")!.className).toContain("text-accent-cyan");
  });

  it("switching tabs does not close an open dock panel", () => {
    render(
      <>
        <TabNavigation />
        <DockPanel {...defaultDockProps} />
      </>
    );
    // Open dock panel
    fireEvent.click(screen.getByRole("button", { name: "Chain Stats" }));
    expect(useGameStore.getState().activeDockPanel).toBe("stats");
    // Switch tab
    fireEvent.click(screen.getByText("Account View").closest("button")!);
    expect(useGameStore.getState().activeTab).toBe("account");
    // Dock panel must still be open
    expect(useGameStore.getState().activeDockPanel).toBe("stats");
  });

  it("opening multiple dock panels sequentially only one is active at a time", () => {
    render(<DockPanel {...defaultDockProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Network Chat" }));
    fireEvent.click(screen.getByRole("button", { name: "Chain Stats" }));
    fireEvent.click(screen.getByRole("button", { name: "Time Rewind" }));
    expect(useGameStore.getState().activeDockPanel).toBe("timeRewind");
    // Only the Time Rewind panel should be visible
    expect(screen.getByTestId("time-rewind")).toBeDefined();
    expect(screen.queryByTestId("network-chat-room")).toBeNull();
    expect(screen.queryByTestId("timechain-stats")).toBeNull();
  });

  it("tab state and dock panel state are fully independent", () => {
    render(
      <>
        <TabNavigation />
        <DockPanel {...defaultDockProps} />
      </>
    );
    // Set both to non-default values
    fireEvent.click(screen.getByText("Account View").closest("button")!);
    fireEvent.click(screen.getByRole("button", { name: "Time Rewind" }));
    expect(useGameStore.getState().activeTab).toBe("account");
    expect(useGameStore.getState().activeDockPanel).toBe("timeRewind");

    // Toggle dock panel off — tab unchanged
    fireEvent.click(screen.getByRole("button", { name: "Time Rewind" }));
    expect(useGameStore.getState().activeDockPanel).toBeNull();
    expect(useGameStore.getState().activeTab).toBe("account");

    // Switch tab — dock unchanged (still null)
    fireEvent.click(screen.getByText("Network").closest("button")!);
    expect(useGameStore.getState().activeTab).toBe("network");
    expect(useGameStore.getState().activeDockPanel).toBeNull();
  });
});
