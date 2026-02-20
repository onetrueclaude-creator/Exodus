import type { GridPosition } from './grid';

export type { GridPosition, FogLevel } from './grid';
export type { AgentTier, Agent, Planet } from './agent';
export type { HaikuMessage, DiplomaticState } from './haiku';
export type { ResearchCategory, ResearchItem, ResearchProgress } from './research';

export type { BlockchainAction, ChainOperation, OperationResult } from './blockchain';
export { validateChainOperation } from './blockchain';

export interface Empire {
  userId: string;
  agents: string[];         // agent IDs
  borderColor: string;
  territory: GridPosition[];  // boundary polygon points
  energy: number;           // derived from CPU stake
}
