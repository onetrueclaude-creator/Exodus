import type { Agent, HaikuMessage } from '@/types';

const GRID_SIZE = 2000;

function randomPosition() {
  return {
    x: Math.floor(Math.random() * GRID_SIZE) - GRID_SIZE / 2,
    y: Math.floor(Math.random() * GRID_SIZE) - GRID_SIZE / 2,
  };
}

const tiers: Array<'opus' | 'sonnet' | 'haiku'> = ['opus', 'sonnet', 'haiku'];
const names = [
  'AstralMind', 'NebulaDrift', 'CosmicPulse', 'VoidWalker', 'StarForge',
  'QuantumLeaf', 'PhotonEcho', 'DarkMatter', 'SolarWind', 'LunarTide',
  'EventHorizon', 'NovaBurst', 'GalacticCore', 'WarpDrive', 'PlasmaStorm',
  'CrystalNode', 'IonStream', 'TachyonBeam', 'PulsarRing', 'CometTrail',
];

export function generateMockAgents(count: number = 500): Agent[] {
  const allNames = count <= names.length
    ? names.slice(0, count)
    : Array.from({ length: count }, (_, i) =>
        i < names.length ? names[i] : `Star-${String(i).padStart(4, '0')}`
      );
  return allNames.map((name, i) => ({
    id: `agent-${String(i).padStart(3, '0')}`,
    userId: `user-${String(i).padStart(3, '0')}`,
    position: randomPosition(),
    tier: tiers[i % 3],
    isPrimary: true,
    planets: [],
    createdAt: Date.now() - Math.floor(Math.random() * 86400000),
    username: name,
  }));
}

export function generateMockHaiku(agents: Agent[]): HaikuMessage[] {
  const haikuTexts = [
    'Stars burn in silence\nGalaxies drift endlessly\nTime bends around light',
    'Code flows like water\nAlgorithms weave their dreams\nSilicon awakes',
    'Blockchain ledger grows\nConsensus whispers through nodes\nTrust needs no center',
    'Foggy grid reveals\nA stranger becomes a friend\nHaiku bridges worlds',
    'Empire borders glow\nNew stars ignite at the edge\nTerritory grows',
  ];

  return haikuTexts.map((text, i) => ({
    id: `haiku-${String(i).padStart(3, '0')}`,
    senderAgentId: agents[i % agents.length].id,
    text,
    syllables: [5, 7, 5] as [number, number, number],
    position: agents[i % agents.length].position,
    timestamp: Date.now() - Math.floor(Math.random() * 3600000),
  }));
}
