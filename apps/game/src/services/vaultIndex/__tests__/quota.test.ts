// @vitest-environment node
// §6 quota truth table (D5) against TimeLedger-shaped fixtures + the
// api.py:461 proxy-keying regression guard (Global Constraint 7).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { deriveTier, RateWindow, type StandingFacts, type VaultQuotaParams } from '../quota';

const PARAMS: VaultQuotaParams = {
  quotaTiers: {
    read_only: { search_per_min: 20, writes_per_day: 0 },
    wallet: { search_per_min: 30, writes_per_day: 8 },
    standing: { search_per_min: 30, writes_per_day: 32 },
    veteran: { search_per_min: 60, writes_per_day: 128 },
  },
  standingPassWindows: 7, standingGateTime: 2, veteranGateTime: 5,
  timeEpochBlocks: 1440,
};

// TimeLedger fixture semantics: time_accrued is the monotonic gates-only
// counter; T(2)=2, T(4)=5 (chain-resolved thresholds, Task 2).
function facts(over: Partial<StandingFacts> = {}): StandingFacts {
  return { walletBound: true, timeAccrued: 0, lastPassBlock: null, currentBlock: 20000, ...over };
}

describe('deriveTier — the §6 truth table, row by row', () => {
  it('token without bound wallet → read_only (whatever the other facts say)', () => {
    expect(deriveTier(facts({ walletBound: false, timeAccrued: 99, lastPassBlock: 19999 }), PARAMS))
      .toBe('read_only');
  });

  it('wallet-bound, no service standing → wallet', () => {
    expect(deriveTier(facts(), PARAMS)).toBe('wallet');
    // stale pass: exactly one block beyond the 7-window horizon
    expect(deriveTier(facts({ lastPassBlock: 20000 - 7 * 1440 - 1, timeAccrued: 1 }), PARAMS))
      .toBe('wallet');
  });

  it('standing via a pass inside the last 7 Time-windows', () => {
    expect(deriveTier(facts({ lastPassBlock: 20000 - 7 * 1440 }), PARAMS)).toBe('standing');
    expect(deriveTier(facts({ lastPassBlock: 19999 }), PARAMS)).toBe('standing');
  });

  it('standing via meets_gate(2): Time ≥ 2', () => {
    expect(deriveTier(facts({ timeAccrued: 2 }), PARAMS)).toBe('standing');
    expect(deriveTier(facts({ timeAccrued: 1 }), PARAMS)).toBe('wallet');
  });

  it('veteran via meets_gate(4): Time ≥ 5 (T(4)=5)', () => {
    expect(deriveTier(facts({ timeAccrued: 5 }), PARAMS)).toBe('veteran');
    expect(deriveTier(facts({ timeAccrued: 4 }), PARAMS)).toBe('standing'); // 4 ≥ T(2) but < T(4)
    expect(deriveTier(facts({ timeAccrued: 4, lastPassBlock: null }), PARAMS)).toBe('standing');
  });
});

describe('RateWindow — keyed by token subject, never by IP', () => {
  it('enforces the per-minute limit per sub with a sliding window', () => {
    const w = new RateWindow();
    const t0 = 1_000_000;
    for (let n = 0; n < 20; n++) expect(w.hit('sub-a', 20, t0 + n)).toBe(true);
    expect(w.hit('sub-a', 20, t0 + 21)).toBe(false);            // 21st inside the minute
    expect(w.hit('sub-a', 20, t0 + 60_001)).toBe(true);         // window slid
  });

  it('REGRESSION GUARD (api.py:461 class): two subjects behind one proxy IP are independent', () => {
    // Simulated proxy: both subjects arrive from the same address — the
    // window must not care, because its ONLY key is the token subject.
    const w = new RateWindow();
    const t0 = 2_000_000;
    for (let n = 0; n < 20; n++) w.hit('sub-a', 20, t0 + n);
    expect(w.hit('sub-a', 20, t0 + 30)).toBe(false);            // a is throttled
    expect(w.hit('sub-b', 20, t0 + 30)).toBe(true);             // b is untouched
  });

  it('structural: the quota module never reads request/IP identity', () => {
    const src = readFileSync(path.join(__dirname, '..', 'quota.ts'), 'utf8');
    for (const token of ['x-forwarded-for', 'remoteAddress', 'req.ip', 'X-Real-IP']) {
      expect(src.toLowerCase()).not.toContain(token.toLowerCase());
    }
  });

  it('structural: no AGNTC coupling — quota derives from standing facts only', () => {
    for (const file of ['quota.ts', 'token.ts']) {
      const src = readFileSync(path.join(__dirname, '..', file), 'utf8').toLowerCase();
      expect(src).not.toContain('agntc');
      expect(src).not.toContain('airdrop');
    }
  });
});
