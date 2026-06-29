import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isFounderEmail } from '@/lib/founders';

/**
 * GET /api/me — the single server-authoritative identity source.
 * Tier (subscription) and role come ONLY from the DB + the Founder allowlist;
 * the client cannot influence them. See B1 plan / design spec §6, §8.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true, subscription: true, role: true, phantomWalletPubkey: true, genesisCohortBatch: true },
  });

  const role = isFounderEmail(session.user.email) ? 'FOUNDER' : (user?.role ?? 'PLAYER');

  return NextResponse.json({
    username: user?.username ?? null,
    tier: user?.subscription ?? null,
    role,
    isOnChain: !!user?.phantomWalletPubkey,
    genesisCohortBatch: user?.genesisCohortBatch ?? null,
  });
}
