import type { Agent, HaikuMessage } from '@/types';
import { getNodeCpuPerTurn } from '@/lib/nodeTier';

const GRID_SIZE = 8000;

function randomPosition() {
  return {
    x: Math.floor(Math.random() * GRID_SIZE) - GRID_SIZE / 2,
    y: Math.floor(Math.random() * GRID_SIZE) - GRID_SIZE / 2,
  };
}

const names = [
  'AstralMind', 'NebulaDrift', 'CosmicPulse',
];

const UNCLAIMED_SLOT_COUNT = 1000; // blockchain-minted nodes scattered across the network

/**
 * Generate the initial map state:
 * - `count` user-owned agents (each user starts with 1 Sonnet)
 * - ~40 unclaimed CPU slots (blockchain-governed, no owner)
 *
 * Unclaimed slots have userId = '' — they're on-chain space waiting to be claimed.
 */
export function generateMockAgents(count: number = 3): Agent[] {
  // 1. User-owned agents — each user starts at L4 (cortex band)
  const START_LEVEL = 4;
  const userAgents: Agent[] = Array.from({ length: count }, (_, i) => ({
    id: `agent-${String(i).padStart(3, '0')}`,
    userId: `user-${String(i).padStart(3, '0')}`,
    position: randomPosition(),
    level: START_LEVEL,
    miningCpu: 0,
    securingCpu: 0,
    levelingUntilTurn: null,
    isPrimary: i === 0,
    planets: [],
    createdAt: Date.now() - Math.floor(Math.random() * 86400000),
    username: i === 0 ? 'You' : (names[i] || `User-${i}`),
    borderRadius: 90,   // cortex base border
    borderPressure: 0,
    cpuPerTurn: getNodeCpuPerTurn(START_LEVEL),
    miningRate: 5,      // cortex base mining rate
    energyLimit: getNodeCpuPerTurn(START_LEVEL) * 5,
    stakedCpu: 0,
  }));

  // 2. Unclaimed CPU slots — blockchain-minted, no owner
  const unclaimedSlots: Agent[] = Array.from({ length: UNCLAIMED_SLOT_COUNT }, (_, i) => ({
    id: `slot-${String(i).padStart(4, '0')}`,
    userId: '',       // no owner — governed by testnet
    position: randomPosition(),
    level: 1,         // unclaimed nodes start at L1 (synapse), reassigned on claim
    miningCpu: 0,
    securingCpu: 0,
    levelingUntilTurn: null,
    isPrimary: false,
    planets: [],
    createdAt: Date.now() - 86400000, // minted at server start
    username: `Node-${String(i).padStart(4, '0')}`,
    borderRadius: 30, // minimal territory footprint
    borderPressure: 0,
    cpuPerTurn: 0,    // no cost while unclaimed
    miningRate: 0,    // no mining while unclaimed
    energyLimit: 0,
    stakedCpu: 0,
    density: Math.round((0.1 + Math.random() * 0.9) * 100) / 100, // 0.10–1.00
    storageSlots: 1 + Math.floor(Math.random() * 8), // 1–8 data packet slots
  }));

  return [...userAgents, ...unclaimedSlots];
}

export function generateMockHaiku(agents: Agent[]): HaikuMessage[] {
  const ownedAgents = agents.filter(a => a.userId !== '');
  if (ownedAgents.length === 0) return [];

  const haikuTexts = [
    'Stars burn in silence\nGalaxies drift endlessly\nTime bends around light',
    'Code flows like water\nAlgorithms weave their dreams\nSilicon awakes',
    'Blockchain ledger grows\nConsensus whispers through nodes\nTrust needs no center',
  ];

  return haikuTexts.map((text, i) => ({
    id: `haiku-${String(i).padStart(3, '0')}`,
    senderAgentId: ownedAgents[i % ownedAgents.length].id,
    text,
    syllables: [5, 7, 5] as [number, number, number],
    position: ownedAgents[i % ownedAgents.length].position,
    timestamp: Date.now() - Math.floor(Math.random() * 3600000),
  }));
}
