import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';
import type { SubscriptionTier } from '@/types/subscription';
import { CHAIN_GRID_MIN, CHAIN_GRID_MAX } from '@/types/testnet';

/**
 * POST /api/subscribe
 *
 * Sets the user's subscription tier, assigns a starting coordinate
 * on the blockchain grid, and creates their first agent.
 *
 * Body: { tier: 'COMMUNITY' | 'PROFESSIONAL' | 'MAX' }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const tier = body.tier as SubscriptionTier;

  const plan = SUBSCRIPTION_PLANS.find(p => p.tier === tier);
  if (!plan) {
    return NextResponse.json({ error: 'Invalid subscription tier' }, { status: 400 });
  }

  // Check if user already has a subscription
  const existing = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { subscription: true, startCoordX: true },
  });

  if (existing?.startCoordX !== null && existing?.startCoordX !== undefined) {
    return NextResponse.json({ error: 'Already registered' }, { status: 409 });
  }

  // Assign a deterministic coordinate based on user ID hash
  const hash = simpleHash(session.user.id);
  const coordX = CHAIN_GRID_MIN + (hash % (CHAIN_GRID_MAX - CHAIN_GRID_MIN + 1));
  const coordY = CHAIN_GRID_MIN + ((hash * 2654435761) % (CHAIN_GRID_MAX - CHAIN_GRID_MIN + 1));

  // Generate a wallet address (deterministic from user ID)
  const walletAddress = `0x${hashToHex(session.user.id).slice(0, 40)}`;

  // Generate a starting agent ID
  const startAgentId = `agent-${session.user.id.slice(0, 8)}-${Date.now().toString(36)}`;

  // Update user record with subscription + starting conditions
  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      subscription: tier,
      walletAddress,
      startCoordX: coordX,
      startCoordY: coordY,
      startAgentId,
      startEnergy: plan.startEnergy,
    },
  });

  // TODO: Record the claim on the testnet blockchain via POST /api/claim
  // For now, the claim is stored in the database and will be synced on game load

  return NextResponse.json({
    subscription: tier,
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

/** Convert string to hex hash */
function hashToHex(str: string): string {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) | 0; // FNV prime
  }
  // Generate 20 bytes (40 hex chars) from multiple rounds
  let hex = '';
  for (let i = 0; i < 5; i++) {
    hash = (hash * 0x01000193 + i) | 0;
    hex += Math.abs(hash).toString(16).padStart(8, '0');
  }
  return hex;
}
