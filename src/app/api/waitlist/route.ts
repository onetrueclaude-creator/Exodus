import { NextResponse } from 'next/server';

/**
 * Legacy waitlist endpoint — replaced by /api/subscribe.
 * Stubbed until database is running.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Waitlist closed. Please use /subscribe.' },
    { status: 410 },
  );
}

export async function GET() {
  return NextResponse.json({ count: 0 });
}
