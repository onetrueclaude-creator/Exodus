import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';
import type { SubscriptionTier } from '@/types/subscription';
import { CHAIN_GRID_MIN, CHAIN_GRID_MAX } from '@/types/testnet';

/**
 * POST /api/subscribe
 *
 * Sets the user's subscription tier and assigns a starting coordinate
 * on the blockchain grid.
 *
 * Body: { tier, username, walletAddress? }
 *
 * NOTE: Database persistence will be added once PostgreSQL is running.
 * For now, returns the starting conditions so the client can proceed.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const tier = body.tier as SubscriptionTier;
  const username = body.username as string;
  const walletAddress = body.walletAddress as string | null;

  const plan = SUBSCRIPTION_PLANS.find(p => p.tier === tier);
  if (!plan) {
    return NextResponse.json({ error: 'Invalid subscription tier' }, { status: 400 });
  }

  // Assign a coordinate based on user email hash
  const userId = session.user.email ?? session.user.id ?? 'anon';
  const hash = simpleHash(userId);
  const coordX = CHAIN_GRID_MIN + (hash % (CHAIN_GRID_MAX - CHAIN_GRID_MIN + 1));
  const coordY = CHAIN_GRID_MIN + ((hash * 2654435761) % (CHAIN_GRID_MAX - CHAIN_GRID_MIN + 1));

  const startAgentId = `agent-${username}-${Date.now().toString(36)}`;

  return NextResponse.json({
    subscription: tier,
    username,
    walletAddress,
    startCoord: { x: coordX, y: coordY },
    startAgentId,
    startEnergy: plan.startEnergy,
    startAgntc: plan.startAgntc,
    startMinerals: plan.startMinerals,
    startAgent: plan.startAgent,
  });
}

/** Simple numeric hash from string */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
