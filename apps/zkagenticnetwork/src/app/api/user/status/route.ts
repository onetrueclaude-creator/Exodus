import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/** GET /api/user/status — returns onboarding completeness for middleware */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true, subscription: true, phantomWalletHash: true },
  });

  return NextResponse.json({
    username: user?.username ?? null,
    subscription: user?.subscription ?? null,
    hasPhantomWallet: !!user?.phantomWalletHash,
  });
}
