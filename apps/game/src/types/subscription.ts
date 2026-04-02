import type { AgentTier } from "./agent";

export type SubscriptionTier = "COMMUNITY" | "PROFESSIONAL" | "MAX";

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  price: number; // USD per month (0 = free)
  priceLabel: string;
  startAgent: AgentTier;
  homenode: string; // display label for the homenode tier
  startEnergy: number;
  startAgntc: number;
  startMinerals: number;
  features: string[];
  accent: string; // Tailwind color classes: text border bg
  maxAgentTier: AgentTier; // highest tier agent this subscription can create
}

/** Subscription plans — determines starting conditions at registration */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    tier: "COMMUNITY",
    name: "Community",
    price: 0,
    priceLabel: "Free",
    startAgent: "sonnet",
    homenode: "Sonnet Homenode",
    startEnergy: 100,
    startAgntc: 10,
    startMinerals: 10,
    features: [
      "1 Sonnet agent at registration",
      "100 CPU Energy starting balance",
      "10 AGNTC tokens",
      "Deploy Haiku sub-agents",
      "Community governance voting",
    ],
    accent: "text-white border-white/30 bg-white/5",
    maxAgentTier: "haiku",
  },
  {
    tier: "PROFESSIONAL",
    name: "Professional",
    price: 50,
    priceLabel: "$50/mo",
    startAgent: "sonnet",
    homenode: "Opus Homenode",
    startEnergy: 500,
    startAgntc: 100,
    startMinerals: 50,
    features: [
      "1 Sonnet agent at registration",
      "500 Energy starting balance",
      "100 AGNTC tokens",
      "Deploy up to Opus agents",
      "Validator node access",
      "Priority border pressure",
    ],
    accent: "text-cyan-400 border-cyan-400/30 bg-cyan-400/5",
    maxAgentTier: "opus",
  },
  {
    tier: "MAX",
    name: "Max",
    price: 200,
    priceLabel: "$200/mo",
    startAgent: "opus",
    homenode: "Opus Homenode",
    startEnergy: 2000,
    startAgntc: 500,
    startMinerals: 200,
    features: [
      "1 Opus agent at registration",
      "2000 Energy starting balance",
      "500 AGNTC tokens",
      "Deploy unlimited Opus agents",
      "Full validator suite",
      "Maximum border influence",
      "Direct chain governance",
    ],
    accent: "text-orange-400 border-orange-400/30 bg-orange-400/5",
    maxAgentTier: "opus",
  },
];
