import type { SubscriptionTier } from '@/types/subscription';

export type Tier = 'community' | 'professional' | 'founder';

export interface ServerIdentity {
  tier: SubscriptionTier | null;   // subscription tier from the DB
  role: 'PLAYER' | 'FOUNDER' | 'ADMIN';
  isOnChain: boolean;
  username: string | null;
}

export interface DevIdentityOpts {
  devIdentityEnabled: boolean;
  devTier?: string | null;            // localStorage 'dev_tier'
  devSubscription?: string | null;    // localStorage 'dev_subscription'
}

export interface ResolvedIdentity {
  tier: Tier;
  subscription: SubscriptionTier;
  source: 'server' | 'dev';
}

const SUB_TO_TIER: Record<SubscriptionTier, Tier> = {
  COMMUNITY: 'community',
  PROFESSIONAL: 'professional',
};

const VALID_TIERS: readonly Tier[] = ['community', 'professional', 'founder'];

/**
 * Server-authoritative identity resolution. The server result ALWAYS wins. The
 * dev localStorage fallback is consulted only when there is no server identity
 * AND the explicit dev flag is on. Otherwise returns null (no spoofable default).
 */
export function resolveClientIdentity(
  server: ServerIdentity | null,
  dev: DevIdentityOpts,
): ResolvedIdentity | null {
  if (server && server.tier) {
    const subscription = server.tier;
    const tier: Tier = server.role === 'FOUNDER' ? 'founder' : SUB_TO_TIER[subscription];
    return { tier, subscription, source: 'server' };
  }
  if (dev.devIdentityEnabled) {
    const subscription = (dev.devSubscription as SubscriptionTier | null) ?? 'PROFESSIONAL';
    const devTier = (dev.devTier ?? '').toLowerCase() as Tier;
    const tier: Tier = VALID_TIERS.includes(devTier) ? devTier : 'founder';
    return { tier, subscription, source: 'dev' };
  }
  return null;
}
