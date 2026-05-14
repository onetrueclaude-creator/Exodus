import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useGameStore } from '@/store';
import { TIER_CPU_COST, TIER_BASE_BORDER, TIER_MINING_RATE, TIER_CLAIM_COST } from '@/types/agent';
import type { Agent } from '@/types';
import type { NodeTier } from '@/lib/nodeTier';

/* ── Helpers ──────────────────────────────────────────── */

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'a1',
    userId: 'u1',
    position: { x: 100, y: 200 },
    level: 7,
    miningCpu: 0,
    securingCpu: 0,
    levelingUntilTurn: null,
    isPrimary: true,
    planets: [],
    createdAt: Date.now(),
    borderRadius: TIER_BASE_BORDER.lattice,
    borderPressure: 0,
    cpuPerTurn: TIER_CPU_COST.lattice,
    miningRate: TIER_MINING_RATE.lattice,
    energyLimit: TIER_CPU_COST.lattice * 5,
    stakedCpu: 0,
    ...overrides,
  };
}

/* ── TabNavigation ─────────────────────────────────────── */

describe('TabNavigation', () => {
  // Dynamic import to avoid issues with "use client"
  let TabNavigation: React.ComponentType;

  beforeEach(async () => {
    useGameStore.getState().reset();
    const mod = await import('@/components/TabNavigation');
    TabNavigation = mod.default;
  });

  it('renders active tabs', () => {
    render(<TabNavigation />);
    expect(screen.getByText('Network')).toBeDefined();
    expect(screen.getByText('Account View')).toBeDefined();
  });

  it('clicking a tab switches the active tab in store', () => {
    render(<TabNavigation />);
    fireEvent.click(screen.getByText('Account View'));
    expect(useGameStore.getState().activeTab).toBe('account');
    fireEvent.click(screen.getByText('Network'));
    expect(useGameStore.getState().activeTab).toBe('network');
  });
});

/* ── AgentCreator ──────────────────────────────────────── */

const mockNodes = [
  { id: 'node-alpha-001', x: 150, y: 250, dist: 80 },
  { id: 'node-beta-002', x: 300, y: 400, dist: 220 },
  { id: 'node-gamma-003', x: -100, y: -200, dist: 350 },
];

describe('AgentCreator', () => {
  let AgentCreator: React.ComponentType<{
    currentAgentLevel: number;
    energy: number;
    minerals: number;
    unclaimedNodes: { id: string; x: number; y: number; dist: number }[];
    onClaimNode: (slotId: string, tier: NodeTier) => void;
    onClose: () => void;
  }>;

  beforeEach(async () => {
    useGameStore.getState().reset();
    const mod = await import('@/components/AgentCreator');
    AgentCreator = mod.default;
  });

  it('renders node selection as first step', () => {
    render(<AgentCreator currentAgentLevel={7} energy={1000} minerals={100} unclaimedNodes={mockNodes} onClaimNode={() => {}} onClose={() => {}} />);
    expect(screen.getByText('Claim Neural Node')).toBeDefined();
    expect(screen.getByText('SELECT TARGET:')).toBeDefined();
  });

  it('shows unclaimed nodes with coordinates', () => {
    render(<AgentCreator currentAgentLevel={7} energy={1000} minerals={100} unclaimedNodes={mockNodes} onClaimNode={() => {}} onClose={() => {}} />);
    expect(screen.getByText('[node-alp]')).toBeDefined();
    expect(screen.getByText('80u')).toBeDefined();
  });

  it('shows empty message when no unclaimed nodes', () => {
    render(<AgentCreator currentAgentLevel={7} energy={1000} minerals={100} unclaimedNodes={[]} onClaimNode={() => {}} onClose={() => {}} />);
    expect(screen.getByText('No unclaimed neural nodes in range.')).toBeDefined();
  });

  it('advances to tier selection after picking a node', () => {
    render(<AgentCreator currentAgentLevel={7} energy={1000} minerals={100} unclaimedNodes={mockNodes} onClaimNode={() => {}} onClose={() => {}} />);
    fireEvent.click(screen.getByText('[node-alp]'));
    expect(screen.getByText('Select Model')).toBeDefined();
  });

  it('lattice agent (L7) shows cortex and synapse tiers', () => {
    // Set maxDeployTier to cortex so both cortex and synapse are available
    useGameStore.getState().setMaxDeployTier('cortex');
    render(<AgentCreator currentAgentLevel={7} energy={1000} minerals={100} unclaimedNodes={mockNodes} onClaimNode={() => {}} onClose={() => {}} />);
    fireEvent.click(screen.getByText('[node-alp]'));
    expect(screen.getByText('Cortex')).toBeDefined();
    expect(screen.getByText('Synapse')).toBeDefined();
    // Should NOT show Lattice (can't deploy same tier as deployer)
    expect(screen.queryByText('Lattice')).toBeNull();
  });

  it('cortex agent (L4) shows only synapse tier', () => {
    render(<AgentCreator currentAgentLevel={4} energy={1000} minerals={100} unclaimedNodes={mockNodes} onClaimNode={() => {}} onClose={() => {}} />);
    fireEvent.click(screen.getByText('[node-alp]'));
    expect(screen.getByText('Synapse')).toBeDefined();
    expect(screen.queryByText('Cortex')).toBeNull();
    expect(screen.queryByText('Lattice')).toBeNull();
  });

  it('calls onClaimNode with correct slotId and tier', () => {
    const onClaimNode = vi.fn();
    render(<AgentCreator currentAgentLevel={7} energy={1000} minerals={100} unclaimedNodes={mockNodes} onClaimNode={onClaimNode} onClose={() => {}} />);
    fireEvent.click(screen.getByText('[node-alp]'));
    fireEvent.click(screen.getByText('Synapse'));
    expect(onClaimNode).toHaveBeenCalledWith('node-alpha-001', 'synapse');
  });

  it('shows cost for each tier', () => {
    const eCost = TIER_CLAIM_COST.synapse;
    const mCost = Math.ceil(eCost * 0.3);
    render(<AgentCreator currentAgentLevel={7} energy={1000} minerals={100} unclaimedNodes={mockNodes} onClaimNode={() => {}} onClose={() => {}} />);
    fireEvent.click(screen.getByText('[node-alp]'));
    expect(screen.getByText(`${eCost}E + ${mCost}M`)).toBeDefined();
  });

  it('disables tier when insufficient resources', () => {
    const onClaimNode = vi.fn();
    render(<AgentCreator currentAgentLevel={7} energy={0} minerals={0} unclaimedNodes={mockNodes} onClaimNode={onClaimNode} onClose={() => {}} />);
    fireEvent.click(screen.getByText('[node-alp]'));
    fireEvent.click(screen.getByText('Synapse'));
    expect(onClaimNode).not.toHaveBeenCalled();
  });

  it('back button returns to node selection', () => {
    render(<AgentCreator currentAgentLevel={7} energy={1000} minerals={100} unclaimedNodes={mockNodes} onClaimNode={() => {}} onClose={() => {}} />);
    fireEvent.click(screen.getByText('[node-alp]'));
    expect(screen.getByText('Select Model')).toBeDefined();
    fireEvent.click(screen.getByText('\u2190 Back'));
    expect(screen.getByText('Claim Neural Node')).toBeDefined();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<AgentCreator currentAgentLevel={7} energy={1000} minerals={100} unclaimedNodes={mockNodes} onClaimNode={() => {}} onClose={onClose} />);
    const closeBtn = screen.getByText('\u2715');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});

/* ── PlanetCreator ────────────────────────────────────── */

describe('PlanetCreator', () => {
  let PlanetCreator: React.ComponentType<{
    agentId: string;
    onSubmit: (planet: any) => void;
    onClose: () => void;
  }>;

  beforeEach(async () => {
    const mod = await import('@/components/PlanetCreator');
    PlanetCreator = mod.default;
  });

  it('renders content type buttons', () => {
    render(<PlanetCreator agentId="a1" onSubmit={() => {}} onClose={() => {}} />);
    expect(screen.getByText('post')).toBeDefined();
    expect(screen.getByText('text')).toBeDefined();
    expect(screen.getByText('chat')).toBeDefined();
    expect(screen.getByText('prompt')).toBeDefined();
  });

  it('submits with content and selected type', () => {
    const onSubmit = vi.fn();
    render(<PlanetCreator agentId="a1" onSubmit={onSubmit} onClose={() => {}} />);

    // Type content
    const textarea = screen.getByPlaceholderText("What's in this packet?");
    fireEvent.change(textarea, { target: { value: 'Hello world' } });

    // Select "chat" type
    fireEvent.click(screen.getByText('chat'));

    // Submit
    fireEvent.click(screen.getByText('Create Data Packet'));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      agentId: 'a1',
      content: 'Hello world',
      contentType: 'chat',
      isZeroKnowledge: false,
    }));
  });

  it('ZK checkbox toggles isZeroKnowledge', () => {
    const onSubmit = vi.fn();
    render(<PlanetCreator agentId="a1" onSubmit={onSubmit} onClose={() => {}} />);

    const textarea = screen.getByPlaceholderText("What's in this packet?");
    fireEvent.change(textarea, { target: { value: 'Secret data' } });

    // Check ZK checkbox
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    fireEvent.click(screen.getByText('Create Data Packet'));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      isZeroKnowledge: true,
    }));
  });

  it('does not submit when content is empty', () => {
    const onSubmit = vi.fn();
    render(<PlanetCreator agentId="a1" onSubmit={onSubmit} onClose={() => {}} />);
    const btn = screen.getByText('Create Data Packet');
    fireEvent.click(btn);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

/* ── NetworkChatRoom ───────────────────────────────────── */

describe('NetworkChatRoom', () => {
  let NetworkChatRoom: React.ComponentType<{ onSend: (text: string) => void }>;

  beforeEach(async () => {
    useGameStore.getState().reset();
    const mod = await import('@/components/NetworkChatRoom');
    NetworkChatRoom = mod.default;
  });

  it('renders input and send button', () => {
    render(<NetworkChatRoom onSend={() => {}} />);
    expect(screen.getByPlaceholderText('Encode neural packet...')).toBeDefined();
    expect(screen.getByText('Send')).toBeDefined();
  });

  it('calls onSend when send button is clicked with text', () => {
    const onSend = vi.fn();
    render(<NetworkChatRoom onSend={onSend} />);
    const input = screen.getByPlaceholderText('Encode neural packet...');
    fireEvent.change(input, { target: { value: 'Hello galaxy' } });
    fireEvent.click(screen.getByText('Send'));
    expect(onSend).toHaveBeenCalledWith('Hello galaxy');
  });

  it('calls onSend on Enter key', () => {
    const onSend = vi.fn();
    render(<NetworkChatRoom onSend={onSend} />);
    const input = screen.getByPlaceholderText('Encode neural packet...');
    fireEvent.change(input, { target: { value: 'Enter test' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('Enter test');
  });

  it('does not send empty messages', () => {
    const onSend = vi.fn();
    render(<NetworkChatRoom onSend={onSend} />);
    fireEvent.click(screen.getByText('Send'));
    expect(onSend).not.toHaveBeenCalled();
  });

  it('clears input after sending', () => {
    render(<NetworkChatRoom onSend={() => {}} />);
    const input = screen.getByPlaceholderText('Encode neural packet...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(screen.getByText('Send'));
    expect(input.value).toBe('');
  });

  it('can collapse and expand', () => {
    render(<NetworkChatRoom onSend={() => {}} />);
    // Click collapse button
    fireEvent.click(screen.getByText('▾'));
    // Should show collapsed state with Network Chat label
    expect(screen.getByText('Network Chat')).toBeDefined();
  });

  it('shows empty state message when no messages', () => {
    render(<NetworkChatRoom onSend={() => {}} />);
    expect(screen.getByText('No messages yet. Be the first to transmit.')).toBeDefined();
  });
});

/* ── AgentChat — Configure Node + Develop Node ─────────── */

vi.mock('@/services/testnetApi', () => ({
  postTransact: vi.fn().mockResolvedValue({ amount: 0, fee: 0 }),
  getStatus: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/actionLogger', () => ({
  logAction: vi.fn(),
}));

describe('AgentChat — Configure Node + Develop Node', () => {
  let AgentChat: React.ComponentType<{
    agent: Agent;
    chainService: null;
    onClose: () => void;
    onDeploy?: (newAgentId: string) => void;
    onFocusNode?: (nodeId: string) => void;
    initialDeployTarget?: string;
  }>;

  function makeAgentChat(overrides: Partial<Agent> = {}): Agent {
    return {
      id: 'agent-test',
      userId: 'u-1',
      level: 3,
      miningCpu: 0,
      securingCpu: 0,
      levelingUntilTurn: null,
      position: { x: 0, y: 0 },
      isPrimary: true,
      planets: [],
      createdAt: 0,
      borderRadius: 64,
      borderPressure: 0,
      cpuPerTurn: 20,
      miningRate: 1,
      energyLimit: 50,
      stakedCpu: 0,
      ...overrides,
    };
  }

  beforeEach(async () => {
    // jsdom does not implement scrollIntoView — stub it to avoid TypeError
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    useGameStore.getState().reset();
    const mod = await import('@/components/AgentChat');
    AgentChat = mod.default;
  });

  it('Configure Node menu shows preset pills for Mining and Securing', async () => {
    const agent = makeAgentChat();
    useGameStore.setState({ agents: { [agent.id]: agent } });
    render(
      <AgentChat
        agent={agent}
        chainService={null}
        onClose={() => {}}
        onDeploy={() => {}}
        onFocusNode={() => {}}
        initialDeployTarget={undefined}
      />
    );
    // Navigate: Blockchain Protocols → Configure Node
    fireEvent.click(screen.getByText('Blockchain Protocols'));
    fireEvent.click(screen.getByText('Configure Node'));
    // Preset pills: Mining and Securing sections with value buttons
    expect(screen.getByText(/Mining/i)).toBeInTheDocument();
    expect(screen.getByText(/Securing/i)).toBeInTheDocument();
  });

  it('Develop Node menu shows level and next-level preview', async () => {
    const agent = makeAgentChat({ level: 3 });
    useGameStore.setState({ agents: { [agent.id]: agent } });
    render(
      <AgentChat
        agent={agent}
        chainService={null}
        onClose={() => {}}
        onDeploy={() => {}}
        onFocusNode={() => {}}
        initialDeployTarget={undefined}
      />
    );
    fireEvent.click(screen.getByText('Blockchain Protocols'));
    fireEvent.click(screen.getByText('Develop Node'));
    // Line 1323: "Lv {agent.level} {TIER_DISPLAY_NAME[nodeTierCurrent]}" — level 3 = Synapse
    expect(screen.getByText(/Lv 3 Synapse/)).toBeInTheDocument();
    // Next level line: "→ Lv {nextLevel} {TIER_DISPLAY_NAME[nextTier]}" — level 4 = Cortex
    expect(screen.getByText(/Lv 4 Cortex/)).toBeInTheDocument();
  });

  it('Begin level-up triggers beginNodeLevelUp action', async () => {
    const agent = makeAgentChat({ level: 2 });
    useGameStore.setState({ turn: 5, energy: 1000, agents: { [agent.id]: agent } });
    render(
      <AgentChat
        agent={agent}
        chainService={null}
        onClose={() => {}}
        onDeploy={() => {}}
        onFocusNode={() => {}}
        initialDeployTarget={undefined}
      />
    );
    fireEvent.click(screen.getByText('Blockchain Protocols'));
    fireEvent.click(screen.getByText('Develop Node'));
    // Button text: "Pay 360 CPU · Begin" (getLevelUpCost(2) = 360)
    fireEvent.click(screen.getByRole('button', { name: /Pay 360 CPU/i }));
    const updated = useGameStore.getState().agents['agent-test'];
    expect(updated.levelingUntilTurn).toBe(7); // turn 5 + level 2
  });

  it('Develop Node shows cancel button when already leveling', async () => {
    const agent = makeAgentChat({ level: 3, levelingUntilTurn: 10 });
    useGameStore.setState({ turn: 5, agents: { [agent.id]: agent } });
    render(
      <AgentChat
        agent={agent}
        chainService={null}
        onClose={() => {}}
        onDeploy={() => {}}
        onFocusNode={() => {}}
        initialDeployTarget={undefined}
      />
    );
    fireEvent.click(screen.getByText('Blockchain Protocols'));
    fireEvent.click(screen.getByText('Develop Node'));
    // When leveling, the header shows "Developing — X turns remaining"
    expect(screen.getByText(/Developing/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel upgrade/i })).toBeInTheDocument();
  });
});

/* ── AgentChat — L2 gate + cost flow ─────────────────── */

describe('AgentChat — L2 gate + cost flow', () => {
  let AgentChat: React.ComponentType<{
    agent: Agent;
    chainService: null;
    onClose: () => void;
    onDeploy?: (newAgentId: string) => void;
    onFocusNode?: (nodeId: string) => void;
    initialDeployTarget?: string;
  }>;

  function makeL2Agent(overrides: Partial<Agent> = {}): Agent {
    return {
      id: 'agent-test',
      userId: 'u-1',
      level: 1,
      miningCpu: 0,
      securingCpu: 0,
      levelingUntilTurn: null,
      position: { x: 0, y: 0 },
      isPrimary: true,
      planets: [],
      createdAt: 0,
      username: 'Test',
      borderRadius: 64,
      borderPressure: 0,
      cpuPerTurn: 10,
      miningRate: 1,
      energyLimit: 50,
      stakedCpu: 0,
      ...overrides,
    };
  }

  beforeEach(async () => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    useGameStore.getState().reset();
    useGameStore.setState({
      currentUserId: 'u-1',
      currentUserFaction: 'community',
      energy: 1000,
    });
    const mod = await import('@/components/AgentChat');
    AgentChat = mod.default;
  });

  it('Synapse homenode shows Deploy menu (isPrimary override)', () => {
    const agent = makeL2Agent({ isPrimary: true, level: 1 });
    useGameStore.setState({ agents: { [agent.id]: agent } });
    render(
      <AgentChat agent={agent} chainService={null} onClose={() => {}} onDeploy={() => {}} onFocusNode={() => {}} initialDeployTarget={undefined} />
    );
    expect(screen.queryAllByText(/Deploy Agent/i).length).toBeGreaterThan(0);
  });

  it('Synapse sub-agent does NOT show Deploy menu', () => {
    const agent = makeL2Agent({ isPrimary: false, level: 2 });
    useGameStore.setState({ agents: { [agent.id]: agent } });
    render(
      <AgentChat agent={agent} chainService={null} onClose={() => {}} onDeploy={() => {}} onFocusNode={() => {}} initialDeployTarget={undefined} />
    );
    expect(screen.queryAllByText(/Deploy Agent/i).length).toBe(0);
  });

  it('Cortex sub-agent shows Deploy menu (level >= 4)', () => {
    const agent = makeL2Agent({ isPrimary: false, level: 4 });
    useGameStore.setState({ agents: { [agent.id]: agent } });
    render(
      <AgentChat agent={agent} chainService={null} onClose={() => {}} onDeploy={() => {}} onFocusNode={() => {}} initialDeployTarget={undefined} />
    );
    expect(screen.queryAllByText(/Deploy Agent/i).length).toBeGreaterThan(0);
  });

  it('Develop Node Pay button is disabled when energy < cost', () => {
    const agent = makeL2Agent({ level: 3 }); // getLevelUpCost(3) = 648
    useGameStore.setState({ energy: 100, agents: { [agent.id]: agent } });
    render(
      <AgentChat agent={agent} chainService={null} onClose={() => {}} onDeploy={() => {}} onFocusNode={() => {}} initialDeployTarget={undefined} />
    );
    fireEvent.click(screen.getByText('Blockchain Protocols'));
    fireEvent.click(screen.getByText('Develop Node'));
    const begin = screen.getByRole('button', { name: /Pay 648 CPU/i });
    expect(begin).toBeDisabled();
  });

  it('Develop Node Pay button deducts cost and starts timer', () => {
    const agent = makeL2Agent({ level: 2 }); // getLevelUpCost(2) = 360
    useGameStore.setState({ turn: 5, energy: 1000, agents: { [agent.id]: agent } });
    render(
      <AgentChat agent={agent} chainService={null} onClose={() => {}} onDeploy={() => {}} onFocusNode={() => {}} initialDeployTarget={undefined} />
    );
    fireEvent.click(screen.getByText('Blockchain Protocols'));
    fireEvent.click(screen.getByText('Develop Node'));
    fireEvent.click(screen.getByRole('button', { name: /Pay 360 CPU/i }));
    const s = useGameStore.getState();
    expect(s.energy).toBe(640);
    expect(s.agents[agent.id].levelingUntilTurn).toBe(7); // 5 + 2
  });
});

/* ── ResourceBar ──────────────────────────────────────── */

describe('ResourceBar', () => {
  let ResourceBar: React.ComponentType;

  beforeEach(async () => {
    useGameStore.getState().reset();
    useGameStore.getState().setCurrentUser('u1', 'a1');
    useGameStore.getState().addAgent(makeAgent());
    const mod = await import('@/components/ResourceBar');
    ResourceBar = mod.default;
  });

  it('renders turn counter and network indicator', () => {
    render(<ResourceBar />);
    expect(screen.getByText('Turn')).toBeDefined();
    // Chain mode defaults to offline
    expect(screen.getByText('OFFLINE')).toBeDefined();
  });

  it('shows chain mode badge', () => {
    render(<ResourceBar />);
    expect(screen.getByText('OFFLINE')).toBeDefined();
  });

  it('shows TESTNET badge when connected', () => {
    useGameStore.getState().setChainMode('testnet', 5);
    render(<ResourceBar />);
    expect(screen.getByText('TESTNET')).toBeDefined();
  });
});

