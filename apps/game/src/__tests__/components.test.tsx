import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useGameStore } from '@/store';
import { TIER_CPU_COST, TIER_BASE_BORDER, TIER_MINING_RATE, TIER_CLAIM_COST } from '@/types/agent';
import type { Agent, AgentTier } from '@/types';

/* ── Helpers ──────────────────────────────────────────── */

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'a1',
    userId: 'u1',
    position: { x: 100, y: 200 },
    tier: 'opus',
    isPrimary: true,
    planets: [],
    createdAt: Date.now(),
    borderRadius: TIER_BASE_BORDER.opus,
    borderPressure: 0,
    cpuPerTurn: TIER_CPU_COST.opus,
    miningRate: TIER_MINING_RATE.opus,
    energyLimit: TIER_CPU_COST.opus * 5,
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

  it('renders all 4 tabs', () => {
    render(<TabNavigation />);
    expect(screen.getByText('Network')).toBeDefined();
    expect(screen.getByText('Account View')).toBeDefined();
    expect(screen.getByText('Researches')).toBeDefined();
    expect(screen.getByText('Skills')).toBeDefined();
  });

  it('clicking a tab switches the active tab in store', () => {
    render(<TabNavigation />);
    fireEvent.click(screen.getByText('Account View'));
    expect(useGameStore.getState().activeTab).toBe('account');
    fireEvent.click(screen.getByText('Researches'));
    expect(useGameStore.getState().activeTab).toBe('researches');
    fireEvent.click(screen.getByText('Skills'));
    expect(useGameStore.getState().activeTab).toBe('skills');
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
    currentAgentTier: AgentTier;
    energy: number;
    minerals: number;
    unclaimedNodes: { id: string; x: number; y: number; dist: number }[];
    onClaimNode: (slotId: string, tier: AgentTier) => void;
    onClose: () => void;
  }>;

  beforeEach(async () => {
    useGameStore.getState().reset();
    const mod = await import('@/components/AgentCreator');
    AgentCreator = mod.default;
  });

  it('renders node selection as first step', () => {
    render(<AgentCreator currentAgentTier="opus" energy={1000} minerals={100} unclaimedNodes={mockNodes} onClaimNode={() => {}} onClose={() => {}} />);
    expect(screen.getByText('Claim Neural Node')).toBeDefined();
    expect(screen.getByText('SELECT TARGET:')).toBeDefined();
  });

  it('shows unclaimed nodes with coordinates', () => {
    render(<AgentCreator currentAgentTier="opus" energy={1000} minerals={100} unclaimedNodes={mockNodes} onClaimNode={() => {}} onClose={() => {}} />);
    expect(screen.getByText('[node-alp]')).toBeDefined();
    expect(screen.getByText('80u')).toBeDefined();
  });

  it('shows empty message when no unclaimed nodes', () => {
    render(<AgentCreator currentAgentTier="opus" energy={1000} minerals={100} unclaimedNodes={[]} onClaimNode={() => {}} onClose={() => {}} />);
    expect(screen.getByText('No unclaimed neural nodes in range.')).toBeDefined();
  });

  it('advances to tier selection after picking a node', () => {
    render(<AgentCreator currentAgentTier="opus" energy={1000} minerals={100} unclaimedNodes={mockNodes} onClaimNode={() => {}} onClose={() => {}} />);
    fireEvent.click(screen.getByText('[node-alp]'));
    expect(screen.getByText('Select Model')).toBeDefined();
  });

  it('opus agent shows sonnet and haiku tiers', () => {
    // Set maxDeployTier to sonnet so both sonnet and haiku are available
    useGameStore.getState().setMaxDeployTier('sonnet');
    render(<AgentCreator currentAgentTier="opus" energy={1000} minerals={100} unclaimedNodes={mockNodes} onClaimNode={() => {}} onClose={() => {}} />);
    fireEvent.click(screen.getByText('[node-alp]'));
    expect(screen.getByText('sonnet')).toBeDefined();
    expect(screen.getByText('haiku')).toBeDefined();
    // Should NOT show opus (can't deploy same tier)
    expect(screen.queryByText('opus')).toBeNull();
  });

  it('sonnet agent shows only haiku tier', () => {
    render(<AgentCreator currentAgentTier="sonnet" energy={1000} minerals={100} unclaimedNodes={mockNodes} onClaimNode={() => {}} onClose={() => {}} />);
    fireEvent.click(screen.getByText('[node-alp]'));
    expect(screen.getByText('haiku')).toBeDefined();
    expect(screen.queryByText('sonnet')).toBeNull();
    expect(screen.queryByText('opus')).toBeNull();
  });

  it('calls onClaimNode with correct slotId and tier', () => {
    const onClaimNode = vi.fn();
    render(<AgentCreator currentAgentTier="opus" energy={1000} minerals={100} unclaimedNodes={mockNodes} onClaimNode={onClaimNode} onClose={() => {}} />);
    fireEvent.click(screen.getByText('[node-alp]'));
    fireEvent.click(screen.getByText('haiku'));
    expect(onClaimNode).toHaveBeenCalledWith('node-alpha-001', 'haiku');
  });

  it('shows cost for each tier', () => {
    const eCost = TIER_CLAIM_COST.haiku;
    const mCost = Math.ceil(eCost * 0.3);
    render(<AgentCreator currentAgentTier="opus" energy={1000} minerals={100} unclaimedNodes={mockNodes} onClaimNode={() => {}} onClose={() => {}} />);
    fireEvent.click(screen.getByText('[node-alp]'));
    expect(screen.getByText(`${eCost}E + ${mCost}M`)).toBeDefined();
  });

  it('disables tier when insufficient resources', () => {
    const onClaimNode = vi.fn();
    render(<AgentCreator currentAgentTier="opus" energy={0} minerals={0} unclaimedNodes={mockNodes} onClaimNode={onClaimNode} onClose={() => {}} />);
    fireEvent.click(screen.getByText('[node-alp]'));
    fireEvent.click(screen.getByText('haiku'));
    expect(onClaimNode).not.toHaveBeenCalled();
  });

  it('back button returns to node selection', () => {
    render(<AgentCreator currentAgentTier="opus" energy={1000} minerals={100} unclaimedNodes={mockNodes} onClaimNode={() => {}} onClose={() => {}} />);
    fireEvent.click(screen.getByText('[node-alp]'));
    expect(screen.getByText('Select Model')).toBeDefined();
    fireEvent.click(screen.getByText('\u2190 Back'));
    expect(screen.getByText('Claim Neural Node')).toBeDefined();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<AgentCreator currentAgentTier="opus" energy={1000} minerals={100} unclaimedNodes={mockNodes} onClaimNode={() => {}} onClose={onClose} />);
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

/* ── QuickActionMenu (claimed agent) ──────────────────── */

describe('QuickActionMenu (claimed)', () => {
  let QuickActionMenu: React.ComponentType<{
    agent: Agent;
    isOwn: boolean;
    onClose: () => void;
    onAction: (action: string) => void;
  }>;

  beforeEach(async () => {
    useGameStore.getState().reset();
    const mod = await import('@/components/QuickActionMenu');
    QuickActionMenu = mod.default;
  });

  it('renders action buttons for own agent', () => {
    const agent = makeAgent();
    render(<QuickActionMenu agent={agent} isOwn={true} onClose={() => {}} onAction={() => {}} />);
    expect(screen.getByText('Open Terminal')).toBeDefined();
    expect(screen.getByText('Inspect')).toBeDefined();
    expect(screen.getByText('Network Chat')).toBeDefined();
    expect(screen.getByText('Research')).toBeDefined();
    expect(screen.getByText('Manage')).toBeDefined();
    expect(screen.getByText('ZK Secure')).toBeDefined();
    expect(screen.getByText('Vote')).toBeDefined();
  });

  it('hides ownOnly actions for foreign agents', () => {
    const agent = makeAgent({ userId: 'other' });
    render(<QuickActionMenu agent={agent} isOwn={false} onClose={() => {}} onAction={() => {}} />);
    expect(screen.queryByText('Open Terminal')).toBeNull();
    expect(screen.queryByText('Manage')).toBeNull();
    expect(screen.getByText('Inspect')).toBeDefined();
    expect(screen.getByText('Vote')).toBeDefined();
  });

  it('fires onAction with action id', () => {
    const onAction = vi.fn();
    const agent = makeAgent();
    render(<QuickActionMenu agent={agent} isOwn={true} onClose={() => {}} onAction={onAction} />);
    fireEvent.click(screen.getByText('Inspect'));
    expect(onAction).toHaveBeenCalledWith('inspect');
    fireEvent.click(screen.getByText('Research'));
    expect(onAction).toHaveBeenCalledWith('research');
  });

  it('shows node status for own agent', () => {
    const agent = makeAgent();
    useGameStore.getState().addAgent(agent);
    render(<QuickActionMenu agent={agent} isOwn={true} onClose={() => {}} onAction={() => {}} />);
    expect(screen.getByText('Node Status')).toBeDefined();
    expect(screen.getByText('Mining')).toBeDefined();
    expect(screen.getByText('Perimeter')).toBeDefined();
    expect(screen.getByText('Energy Limit')).toBeDefined();
  });

  it('shows Set Primary button for non-primary agents', () => {
    const agent = makeAgent({ isPrimary: false });
    useGameStore.getState().addAgent(agent);
    render(<QuickActionMenu agent={agent} isOwn={true} onClose={() => {}} onAction={() => {}} />);
    expect(screen.getByText('Set as Primary Node')).toBeDefined();
  });
});

/* ── QuickActionMenu (unclaimed node) ─────────────────── */

describe('QuickActionMenu (unclaimed)', () => {
  let QuickActionMenu: React.ComponentType<{
    agent: Agent;
    isOwn: boolean;
    onClose: () => void;
    onAction: (action: string) => void;
  }>;

  beforeEach(async () => {
    useGameStore.getState().reset();
    const mod = await import('@/components/QuickActionMenu');
    QuickActionMenu = mod.default;
  });

  it('shows unclaimed status for nodes with no userId', () => {
    const agent = makeAgent({ userId: '' });
    render(<QuickActionMenu agent={agent} isOwn={false} onClose={() => {}} onAction={() => {}} />);
    expect(screen.getByText('Unclaimed Neural Node')).toBeDefined();
  });

  it('shows Claim as Homenode when user has no current agent', () => {
    // After reset, currentAgentId is null — new user flow
    const agent = makeAgent({ userId: '' });
    render(<QuickActionMenu agent={agent} isOwn={false} onClose={() => {}} onAction={() => {}} />);
    expect(screen.getByText('Claim as Homenode')).toBeDefined();
    expect(screen.queryByText('Deploy Agent Here')).toBeNull();
  });

  it('fires claim-homenode action for new users', () => {
    const onAction = vi.fn();
    const agent = makeAgent({ userId: '' });
    render(<QuickActionMenu agent={agent} isOwn={false} onClose={() => {}} onAction={onAction} />);
    fireEvent.click(screen.getByText('Claim as Homenode'));
    expect(onAction).toHaveBeenCalledWith('claim-homenode');
  });

  it('shows Deploy Agent Here when user already has an agent', () => {
    // Simulate an existing user with a current agent
    useGameStore.getState().setCurrentUser('u1', 'existing-agent');
    useGameStore.getState().addAgent(makeAgent({ id: 'existing-agent' }));
    const agent = makeAgent({ userId: '' });
    render(<QuickActionMenu agent={agent} isOwn={false} onClose={() => {}} onAction={() => {}} />);
    expect(screen.getByText('Deploy Agent Here')).toBeDefined();
    expect(screen.queryByText('Claim as Homenode')).toBeNull();
  });

  it('fires deploy-via-terminal action when user has agent', () => {
    useGameStore.getState().setCurrentUser('u1', 'existing-agent');
    useGameStore.getState().addAgent(makeAgent({ id: 'existing-agent' }));
    const onAction = vi.fn();
    const agent = makeAgent({ userId: '' });
    render(<QuickActionMenu agent={agent} isOwn={false} onClose={() => {}} onAction={onAction} />);
    fireEvent.click(screen.getByText('Deploy Agent Here'));
    expect(onAction).toHaveBeenCalledWith('deploy-via-terminal');
  });

  it('fires inspect action', () => {
    const onAction = vi.fn();
    const agent = makeAgent({ userId: '' });
    render(<QuickActionMenu agent={agent} isOwn={false} onClose={() => {}} onAction={onAction} />);
    fireEvent.click(screen.getByText('Inspect'));
    expect(onAction).toHaveBeenCalledWith('inspect');
  });
});
