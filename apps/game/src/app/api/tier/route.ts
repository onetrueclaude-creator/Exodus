import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SUBSCRIPTION_PLANS } from "@/types/subscription";
import type { SubscriptionTier } from "@/types/subscription";

const ALLOWED: SubscriptionTier[] = ["COMMUNITY", "PROFESSIONAL"];

/**
 * POST /api/tier — change an already-subscribed user's tier (Community ↔
 * Professional). Forward-looking: updates the subscription (+ startEnergy cache);
 * the grid coordinate / claim from onboarding are untouched. Testnet free toggle
 * (Stripe deferred). Onboarding still goes through /api/subscribe.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let tier: unknown;
  try { ({ tier } = await req.json()); } catch { /* fallthrough */ }
  if (typeof tier !== "string" || !ALLOWED.includes(tier as SubscriptionTier)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }
  const plan = SUBSCRIPTION_PLANS.find((p) => p.tier === tier)!;

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { subscription: true } });
  if (!user?.subscription) {
    return NextResponse.json({ error: "No subscription to change — complete onboarding first" }, { status: 409 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { subscription: tier as SubscriptionTier, startEnergy: plan.startEnergy },
  });
  return NextResponse.json({ subscription: tier });
}
