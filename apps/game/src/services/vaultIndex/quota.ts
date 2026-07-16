// §6 write-gating (founder-approved D5): quota tiers derive from soulbound
// participation — wallet binding + PlayerPinRegistry audit standing + Time
// meets_gate THRESHOLD READS. Nothing is spent (gates-only, Global
// Constraint 3) and the network token appears NOWHERE in either direction
// (Global Constraint 2): no memory activity mints it, no payment buys quota.
// Rate limiting is keyed by TOKEN SUBJECT only — this module deliberately
// has no access to the request object, so keying by IP (the chain's
// api.py:461 proxy defect class) is structurally impossible here.

export type QuotaTier = 'read_only' | 'wallet' | 'standing' | 'veteran';

export interface VaultQuotaParams {
  quotaTiers: Record<QuotaTier, { search_per_min: number; writes_per_day: number }>;
  standingPassWindows: number;   // "≥1 audit pass in last N Time-windows"
  standingGateTime: number;      // chain-resolved T(VAULT_MCP_STANDING_GATE_LEVEL)
  veteranGateTime: number;       // chain-resolved T(VAULT_MCP_VETERAN_GATE_LEVEL)
  timeEpochBlocks: number;
}

export interface StandingFacts {
  walletBound: boolean;          // ed25519 Phantom binding exists (Prisma)
  timeAccrued: number;           // TimeLedger monotonic counter (read-only)
  lastPassBlock: number | null;  // freshest durable pin-registry pass
  currentBlock: number;
}

export function deriveTier(f: StandingFacts, p: VaultQuotaParams): QuotaTier {
  if (!f.walletBound) return 'read_only';
  if (f.timeAccrued >= p.veteranGateTime) return 'veteran';
  const horizon = p.standingPassWindows * p.timeEpochBlocks;
  const recentPass = f.lastPassBlock != null && f.currentBlock - f.lastPassBlock <= horizon;
  if (recentPass || f.timeAccrued >= p.standingGateTime) return 'standing';
  return 'wallet';
}

/** Sliding 60s search-rate window. Key = token subject (sub), nothing else.
 * In-memory per instance: acceptable for a 60s horizon on the single-host
 * deploy; the durable writes/day quota lives in Postgres
 * (KnowledgeIndex.countTokenWritesSince), not here. */
export class RateWindow {
  private hits = new Map<string, number[]>();

  hit(sub: string, limitPerMin: number, nowMs: number = Date.now()): boolean {
    const cutoff = nowMs - 60_000;
    const arr = (this.hits.get(sub) ?? []).filter((t) => t > cutoff);
    if (arr.length >= limitPerMin) {
      this.hits.set(sub, arr);
      return false;
    }
    arr.push(nowMs);
    this.hits.set(sub, arr);
    return true;
  }
}
