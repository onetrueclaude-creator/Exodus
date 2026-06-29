import { describe, it, expect } from "vitest";
import {
  generateReferralCode,
  isRefereeQualified,
  referralCreditDelta,
  canEarnReferral,
  REFERRAL_RATE,
  type RefereeActivity,
} from "@/lib/referral";

const active: RefereeActivity = { onChainActions30d: 40, ncpEdges: 5, ageDays: 35 };
const inactive: RefereeActivity = { onChainActions30d: 0, ncpEdges: 0, ageDays: 35 };
const fresh: RefereeActivity = { onChainActions30d: 40, ncpEdges: 5, ageDays: 5 };
const noNcp: RefereeActivity = { onChainActions30d: 40, ncpEdges: 0, ageDays: 35 };

describe("referral", () => {
  it("codes are short, url-safe, deterministic from seed", () => {
    const a = generateReferralCode("user-abc");
    const b = generateReferralCode("user-abc");
    expect(a).toBe(b);
    // base36 of a u32 → lowercase alphanumeric only (assert what it emits, not
    // a wider charset the function can never produce)
    expect(a).toMatch(/^[0-9a-z]{6,10}$/);
    expect(generateReferralCode("user-xyz")).not.toBe(a);
  });

  it("a referee qualifies only after 30 days of real, NCP-embedded activity", () => {
    expect(isRefereeQualified(active)).toBe(true);
    expect(isRefereeQualified(inactive)).toBe(false); // no real activity
    expect(isRefereeQualified(fresh)).toBe(false);     // < 30 days
    expect(isRefereeQualified(noNcp)).toBe(false);      // no NCP-graph backing
  });

  it("credit is proportional to real activity and NEGATIVE for an inactive referee", () => {
    expect(referralCreditDelta(active)).toBeGreaterThan(0);
    expect(referralCreditDelta(active)).toBe(Math.round(active.onChainActions30d * REFERRAL_RATE));
    expect(referralCreditDelta(inactive)).toBeLessThan(0); // lowers referrer score
  });

  it("a tiny-but-nonzero window rounds to a 0 credit (intentional: neither rewarded nor penalised)", () => {
    // documents the boundary the round() produces: 1-4 actions → 0, not negative
    expect(referralCreditDelta({ onChainActions30d: 3, ncpEdges: 5, ageDays: 35 })).toBe(0);
    // and the penalty fires only on a genuinely dead window (zero activity)
    expect(referralCreditDelta({ onChainActions30d: 0, ncpEdges: 5, ageDays: 35 })).toBeLessThan(0);
  });

  it("only KYC-verified referrers can earn", () => {
    expect(canEarnReferral(true)).toBe(true);
    expect(canEarnReferral(false)).toBe(false);
  });
});
