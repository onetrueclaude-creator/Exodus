import { describe, it, expect } from 'vitest';
import { resolveClientIdentity } from './identity';

describe('resolveClientIdentity', () => {
  it('uses the server response when present (server is authoritative)', () => {
    const r = resolveClientIdentity(
      { tier: 'COMMUNITY', role: 'PLAYER', isOnChain: false, username: 'neo', genesisCohortBatch: null },
      { devIdentityEnabled: true, devTier: 'founder', devSubscription: 'PROFESSIONAL' },
    );
    expect(r).toEqual({ tier: 'community', subscription: 'COMMUNITY', source: 'server' });
  });

  it('maps a FOUNDER server role to the founder client tier', () => {
    const r = resolveClientIdentity(
      { tier: 'PROFESSIONAL', role: 'FOUNDER', isOnChain: true, username: 'root', genesisCohortBatch: null },
      { devIdentityEnabled: false },
    );
    expect(r).toEqual({ tier: 'founder', subscription: 'PROFESSIONAL', source: 'server' });
  });

  it('falls back to dev values ONLY when no server identity AND the dev flag is on', () => {
    const r = resolveClientIdentity(null, {
      devIdentityEnabled: true, devTier: 'founder', devSubscription: 'PROFESSIONAL',
    });
    expect(r).toEqual({ tier: 'founder', subscription: 'PROFESSIONAL', source: 'dev' });
  });

  it('returns null (no spoofable default) when no server identity and dev flag off', () => {
    const r = resolveClientIdentity(null, { devIdentityEnabled: false, devTier: 'founder' });
    expect(r).toBeNull();
  });
});
