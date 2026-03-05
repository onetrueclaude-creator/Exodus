import { describe, it, expect } from 'vitest';
import { subscriptionToFaction } from '@/lib/factionPlacement';
import type { SubscriptionTier } from '@/types/subscription';

describe('subscriptionToFaction', () => {
  it('maps COMMUNITY to community faction', () => {
    expect(subscriptionToFaction('COMMUNITY')).toBe('community');
  });

  it('maps PROFESSIONAL to professional faction', () => {
    expect(subscriptionToFaction('PROFESSIONAL')).toBe('professional');
  });

  it('maps MAX to founders faction', () => {
    expect(subscriptionToFaction('MAX')).toBe('founders');
  });
});
