import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';
import type { SubscriptionTier } from '@/types/subscription';
import { CHAIN_GRID_MIN, CHAIN_GRID_MAX } from '@/types/testnet';

const TESTNET_API = process.env.NEXT_PUBLIC_TESTNET_API ?? 'http://localhost:8080';

/**
 * POST /api/subscribe
 *
 * Sets the user's subscription tier, assigns a deterministic grid coordinate
 * (their AGNTC blockchain token), registers the claim on the testnet, and
 * persists everything to the database.
 *
 * Body: { tier }
 *
 * Phantom wallet is NOT involved here — it's an optional upgrade later.
 */
export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const tier = body.tier as SubscriptionTier;

  const plan = SUBSCRIPTION_PLANS.find(p => p.tier === tier);
  if (!plan) {
    return NextResponse.json({ error: 'Invalid subscription tier' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  // Check if already subscribed
  const { data: existing } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('user_id', user.id)
    .single();

  if (existing?.subscription_tier) {
    return NextResponse.json({ error: 'Already subscribed' }, { status: 409 });
  }

  // Assign deterministic grid coordinate (blockchain token)
  const hash = simpleHash(user.id);
  const gridRange = CHAIN_GRID_MAX - CHAIN_GRID_MIN + 1;
  const coordX = CHAIN_GRID_MIN + (hash % gridRange);
  const coordY = CHAIN_GRID_MIN + ((hash * 2654435761) % gridRange);

  const startAgentId = `agent-${user.id.slice(0, 8)}-${Date.now().toString(36)}`;

  // Register claim on testnet blockchain (non-fatal if testnet is down)
  try {
    const claimRes = await fetch(`${TESTNET_API}/api/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_index: 0, x: coordX, y: coordY, stake: 200 }),
    });
    if (!claimRes.ok) {
      const err = await claimRes.json().catch(() => ({ detail: 'Unknown error' }));
      console.error('Testnet claim failed:', err);
    }
  } catch (err) {
    console.error('Testnet unreachable:', err);
  }

  // Update user profile
  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_tier: tier,
      blockchain_token_x: coordX,
      blockchain_token_y: coordY,
      start_agent_id: startAgentId,
    })
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }

  return NextResponse.json({
    subscription: tier,
    blockchainToken: { x: coordX, y: coordY },
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
