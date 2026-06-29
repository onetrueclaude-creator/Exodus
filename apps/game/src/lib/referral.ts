// W7 referral — single-level, KYC-gated, sybil-safe (spec §5). Rewards come
// from the referee's REAL 30-day on-chain activity, NCP-graph-backed; inactive
// referees LOWER the referrer's score (social accountability). Non-monetary:
// this produces airdrop-eligibility score, never cash (disclosure snippet #1).

const ACTIVITY_THRESHOLD_30D = 10; // min real on-chain actions to count as real
const MIN_AGE_DAYS = 30;
const MIN_NCP_EDGES = 1; // a no-NCP wallet is structurally suspect (anti-sybil)
const INACTIVE_PENALTY = -2; // small, fixed; magnitude is a W5 econ-sim tuning knob, not load-bearing here

export const REFERRAL_RATE = 0.1; // modest %

export interface RefereeActivity {
  onChainActions30d: number;
  ncpEdges: number;
  ageDays: number;
}

export function generateReferralCode(seed: string): string {
  // FNV-1a → base36, padded; deterministic and url-safe. base36 of a u32 is at
  // most 7 chars, so output is always 7–8 lowercase-alphanumeric chars.
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(36).padStart(7, "0").slice(0, 8);
}

export function isRefereeQualified(a: RefereeActivity): boolean {
  return (
    a.ageDays >= MIN_AGE_DAYS &&
    a.onChainActions30d >= ACTIVITY_THRESHOLD_30D &&
    a.ncpEdges >= MIN_NCP_EDGES
  );
}

// Per-window credit for an ALREADY-QUALIFIED referral (the age/NCP/activity
// sybil gates are enforced once at qualification time via isRefereeQualified;
// they are a different axis). Here "inactive" means "no activity THIS window"
// (zero on-chain actions) → social-accountability penalty; otherwise the credit
// is proportional to the window's real activity. Tiny action counts round to 0
// (neither rewarded nor penalised) — that is intentional, not a bug.
export function referralCreditDelta(a: RefereeActivity): number {
  if (a.onChainActions30d <= 0) return INACTIVE_PENALTY;
  return Math.round(a.onChainActions30d * REFERRAL_RATE);
}

export function canEarnReferral(referrerKycVerified: boolean): boolean {
  return referrerKycVerified;
}
