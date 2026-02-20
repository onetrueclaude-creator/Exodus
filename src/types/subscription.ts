import type { AgentTier } from './agent';

export type SubscriptionTier = 'COMMUNITY' | 'PROFESSIONAL' | 'MAX';

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  price: number;        // USD per month (0 = free)
  priceLabel: string;
  startAgent: AgentTier;
  startEnergy: number;
  startAgntc: number;
  startMinerals: number;
  features: string[];
  accent: string;       // Tailwind color class
}

/** Subscription plans — determines starting conditions at registration */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    tier: 'COMMUNITY',
    name: 'Community',
    price: 0,
    priceLabel: 'Free',
    startAgent: 'sonnet',
    startEnergy: 100,
    startAgntc: 10,
    startMinerals: 10,
    features: [
      '1 Sonnet agent at registration',
      '100 Energy starting balance',
      '10 AGNTC tokens',
      'Basic border expansion',
      'Community governance voting',
    ],
    accent: 'text-slate-400 border-slate-400/30 bg-slate-400/5',
  },
  {
    tier: 'PROFESSIONAL',
    name: 'Professional Validator',
    price: 50,
    priceLabel: '$50/mo',
    startAgent: 'sonnet',
    startEnergy: 500,
    startAgntc: 100,
    startMinerals: 50,
    features: [
      '1 Sonnet agent at registration',
      '500 Energy starting balance',
      '100 AGNTC tokens',
      'Validator node access',
      'Priority border pressure',
      'Advanced CPU distribution',
      'Research acceleration',
    ],
    accent: 'text-accent-purple border-accent-purple/30 bg-accent-purple/5',
  },
  {
    tier: 'MAX',
    name: 'Max',
    price: 200,
    priceLabel: '$200/mo',
    startAgent: 'opus',
    startEnergy: 2000,
    startAgntc: 500,
    startMinerals: 200,
    features: [
      '1 Opus agent at registration',
      '2000 Energy starting balance',
      '500 AGNTC tokens',
      'Full validator suite',
      'Maximum border influence',
      'Unlimited CPU distribution',
      'Priority research queue',
      'Direct chain governance',
    ],
    accent: 'text-accent-cyan border-accent-cyan/30 bg-accent-cyan/5',
  },
];
