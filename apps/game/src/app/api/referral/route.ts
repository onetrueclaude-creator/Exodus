import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReferralCode } from "@/lib/referral";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, referralCode: true, kycVerifiedAt: true },
  });
  if (!user) return NextResponse.json({ error: "No user" }, { status: 404 });

  if (!user.referralCode) {
    const code = generateReferralCode(user.id);
    user = await prisma.user.update({
      where: { id: user.id },
      data: { referralCode: code },
      select: { id: true, referralCode: true, kycVerifiedAt: true },
    });
  }

  const referralsMade = await prisma.referral.count({ where: { referrerId: user.id } });
  const qualifiedReferrals = await prisma.referral.count({
    where: { referrerId: user.id, qualifiedAt: { not: null } },
  });

  return NextResponse.json({
    code: user.referralCode,
    kycVerified: !!user.kycVerifiedAt,
    referralsMade,
    qualifiedReferrals,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let code: unknown;
  try { ({ code } = await req.json()); } catch { /* fallthrough */ }
  if (typeof code !== "string" || !code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { id: true },
  });
  if (!referrer) return NextResponse.json({ error: "Unknown code" }, { status: 400 });
  if (referrer.id === session.user.id) {
    return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });
  }

  // single-level: a referee can have at most one referral edge. The pre-check is
  // a fast path; the Referral.refereeId @unique constraint is the hard stop. Under
  // a concurrent-POST race both requests can pass the pre-check, so the second
  // create hits P2002 — map that to the same 409 the pre-check returns (never 500).
  const existing = await prisma.referral.findUnique({ where: { refereeId: session.user.id } });
  if (existing) return NextResponse.json({ error: "Already referred" }, { status: 409 });

  try {
    await prisma.referral.create({
      data: { referrerId: referrer.id, refereeId: session.user.id },
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Already referred" }, { status: 409 });
    }
    throw e;
  }
  return NextResponse.json({ ok: true });
}
