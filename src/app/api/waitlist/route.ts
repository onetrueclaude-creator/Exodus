import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/** Max waitlist signups allowed from the same IP in a 1-hour window */
const RATE_LIMIT_PER_IP = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * POST /api/waitlist
 *
 * Adds the authenticated Google user's email to the waitlist.
 * - Requires Google authentication (session must exist)
 * - Rejects duplicates (same email already registered)
 * - Rate-limits by IP to prevent spam registrations
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Authentication required. Please sign in with Google.' },
      { status: 401 },
    );
  }

  const email = session.user.email.toLowerCase().trim();

  // --- Spam detection: validate email format ---
  if (!email.includes('@') || email.length < 5 || email.length > 320) {
    return NextResponse.json(
      { error: 'Invalid email address.' },
      { status: 400 },
    );
  }

  // --- Duplicate check ---
  const existing = await prisma.waitlistEntry.findUnique({
    where: { email },
  });
  if (existing) {
    return NextResponse.json(
      { error: 'This email is already on the waitlist.', alreadyRegistered: true },
      { status: 409 },
    );
  }

  // --- Rate limiting by IP ---
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

  const recentFromIp = await prisma.waitlistEntry.count({
    where: {
      ip,
      createdAt: { gte: windowStart },
    },
  });

  if (recentFromIp >= RATE_LIMIT_PER_IP) {
    return NextResponse.json(
      { error: 'Too many registrations from this network. Please try again later.' },
      { status: 429 },
    );
  }

  // --- Save to database ---
  const entry = await prisma.waitlistEntry.create({
    data: { email, ip },
  });

  return NextResponse.json({
    success: true,
    message: 'You have been added to the waitlist.',
    id: entry.id,
  });
}

/**
 * GET /api/waitlist
 *
 * Returns the current waitlist count (public, no auth required).
 */
export async function GET() {
  const count = await prisma.waitlistEntry.count();
  return NextResponse.json({ count });
}
