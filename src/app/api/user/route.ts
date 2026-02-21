import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

/** PATCH /api/user — set username (one-time during onboarding) */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const username = (body.username as string)?.trim();

  if (!username || !USERNAME_REGEX.test(username)) {
    return NextResponse.json(
      { error: 'Username must be 3-20 characters (letters, numbers, underscore)' },
      { status: 400 },
    );
  }

  // Check uniqueness
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { username },
    select: { username: true },
  });

  return NextResponse.json({ username: user.username });
}
