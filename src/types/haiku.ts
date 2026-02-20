import type { GridPosition } from './grid';

export interface HaikuMessage {
  id: string;
  senderAgentId: string;
  text: string;
  syllables: [number, number, number];
  position: GridPosition;
  timestamp: number;
}

export interface DiplomaticState {
  agentA: string;
  agentB: string;
  exchangeCount: number;
  clarityLevel: number;    // 0-4 maps to exchange level table in design doc
  lastExchange: number;
}
