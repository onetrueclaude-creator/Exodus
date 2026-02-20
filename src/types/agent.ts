import type { GridPosition } from './grid';

export type AgentTier = 'opus' | 'sonnet' | 'haiku';

export interface Agent {
  id: string;
  userId: string;
  position: GridPosition;
  tier: AgentTier;
  isPrimary: boolean;
  planets: string[];       // planet IDs
  createdAt: number;
  username?: string;
  bio?: string;
}

export interface Planet {
  id: string;
  agentId: string;
  content: string;
  contentType: 'post' | 'text' | 'chat' | 'prompt';
  isZeroKnowledge: boolean;
  createdAt: number;
}
