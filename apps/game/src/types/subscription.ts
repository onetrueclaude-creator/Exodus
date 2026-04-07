export type SubscriptionTier = "COMMUNITY" | "PROFESSIONAL" | "MAX";

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  price: number; // USD per month (0 = free)
  priceLabel: string;
  startEnergy: number;
  startAgntc: number;
  startMinerals: number;
  features: string[];
  accent: string; // Tailwind color classes: text border bg
}

/** Subscription plans — determines starting conditions at registration */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    tier: "COMMUNITY",
    name: "Community",
    price: 0,
    priceLabel: "Free",
    startEnergy: 1000,
    startAgntc: 10,
    startMinerals: 10,
    features: [
      "1,000 CPU Energy starting balance",
      "10 AGNTC tokens",
      "Deploy any Claude model (API cost-gated)",
      "1 Moore ring deploy range (8 nodes)",
      "Community governance voting (1x)",
    ],
    accent: "text-white border-white/30 bg-white/5",
  },
  {
    tier: "PROFESSIONAL",
    name: "Professional",
    price: 50,
    priceLabel: "$50/mo",
    startEnergy: 5000,
    startAgntc: 100,
    startMinerals: 50,
    features: [
      "5,000 CPU Energy starting balance",
      "100 AGNTC tokens",
      "Deploy any Claude model (API cost-gated)",
      "2 Moore rings deploy range (24 nodes)",
      "Enhanced governance voting (2x)",
      "Priority border pressure",
    ],
    accent: "text-cyan-400 border-cyan-400/30 bg-cyan-400/5",
  },
  {
    tier: "MAX",
    name: "Max",
    price: 200,
    priceLabel: "$200/mo",
    startEnergy: 20000,
    startAgntc: 500,
    startMinerals: 200,
    features: [
      "20,000 CPU Energy starting balance",
      "500 AGNTC tokens",
      "Deploy any Claude model (API cost-gated)",
      "Full validator suite",
      "Maximum border influence",
      "Direct chain governance",
    ],
    accent: "text-orange-400 border-orange-400/30 bg-orange-400/5",
  },
];
