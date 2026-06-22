import type { GridPosition } from "./grid";

export type { GridPosition, FogLevel } from "./grid";
export type { BlockNode, Tier, CellCoord, LatticeState, GridNode } from "./grid";
export { TIER_LABELS, TIER_COLORS, TIER_CROWN } from "./grid";
export type { OrbitalTier } from "./orbital";
export { TIER_TINT } from "./orbital";
export type { AgentTier, Agent, Planet } from "./agent";
export type { NodeTier } from "@/lib/nodeTier";
export type { HaikuMessage, DiplomaticState } from "./haiku";
export type { ResearchCategory, ResearchItem, ResearchProgress } from "./research";

export type { BlockchainAction, ChainOperation, OperationResult } from "./blockchain";
export { validateChainOperation } from "./blockchain";

export type {
  TestnetStatus,
  CoordinateInfo,
  ClaimInfo,
  AgentInfo,
  GridRegion,
  GridCell,
  MineResult,
  BirthResult,
  ClaimNodeResult,
  NodeInfo,
  IntroRequest,
  IntroResult,
  MessageRequest,
  MessageResult,
  MessageInfo,
  SecureResponse,
  SecuringPositionInfo,
  SecuringStatusResponse,
  TransactResponse,
  WalletSettingsResponse,
  EpochStatus,
  RewardsResponse,
  BalanceResponse,
  VestingResponse,
  VaultRootResponse,
  VaultAssignmentResponse,
  VaultShardResponse,
  VaultChallengeResponse,
  VaultSubmitProofRequest,
  VaultSubmitProofResponse,
  VaultStatusResponse,
} from "./testnet";
export { CHAIN_GRID_MIN, CHAIN_GRID_MAX, CHAIN_GRID_SPAN } from "./testnet";

export type { SubscriptionTier, SubscriptionPlan } from "./subscription";
export { SUBSCRIPTION_PLANS } from "./subscription";

export interface Empire {
  userId: string;
  agents: string[]; // agent IDs
  borderColor: string;
  territory: GridPosition[]; // boundary polygon points
  energy: number; // derived from CPU stake
}
