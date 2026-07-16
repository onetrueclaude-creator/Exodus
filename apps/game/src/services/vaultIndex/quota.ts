// STUB (Task 11) — Task 12 replaces this with the real §6 standing table.
// Signatures are final; behavior is the most restrictive tier.
export type QuotaTier = 'read_only' | 'wallet' | 'standing' | 'veteran';

export interface VaultQuotaParams {
  quotaTiers: Record<QuotaTier, { search_per_min: number; writes_per_day: number }>;
  standingPassWindows: number;
  standingGateTime: number;
  veteranGateTime: number;
  timeEpochBlocks: number;
}

export interface StandingFacts {
  walletBound: boolean;
  timeAccrued: number;
  lastPassBlock: number | null;
  currentBlock: number;
}

export function deriveTier(_facts: StandingFacts, _params: VaultQuotaParams): QuotaTier {
  return 'read_only';
}
