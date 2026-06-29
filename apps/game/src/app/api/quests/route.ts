import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  QUEST_CATALOG,
  scoreForQuest,
  streakBonus,
  windowKeyFor,
} from "@/lib/scoring";

function eventTypeForCadence(cadence: string): "QUEST_DAILY" | "QUEST_WEEKLY" | "QUEST_MILESTONE" {
  if (cadence === "DAILY") return "QUEST_DAILY";
  if (cadence === "WEEKLY") return "QUEST_WEEKLY";
  return "QUEST_MILESTONE";
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { currentStreak: true },
  });
  const completions = await prisma.questCompletion.findMany({
    where: { userId: session.user.id },
    select: { questId: true, windowKey: true },
  });
  const done = new Set(completions.map((c) => `${c.questId}:${c.windowKey}`));

  const quests = QUEST_CATALOG.map((q) => ({
    ...q,
    completedThisWindow: done.has(`${q.key}:${windowKeyFor(q.cadence, now)}`),
  }));
  return NextResponse.json({ quests, currentStreak: user?.currentStreak ?? 0 });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  let key: unknown;
  try { ({ key } = await req.json()); } catch { /* fallthrough */ }
  const quest = QUEST_CATALOG.find((q) => q.key === key);
  if (!quest) return NextResponse.json({ error: "Unknown quest" }, { status: 400 });

  // SECURITY: protocol-valuable completions are NEVER self-attested. Awarding
  // them on a bare client POST would let anyone farm airdrop-eligibility score
  // without doing the work — the exact sybil/gaming vector the 8x protocol
  // weighting exists to resist. They are written only by trusted server-side
  // verifiers that confirm the REAL action (Secure / governance vote / verified
  // bug report / node-uptime telemetry / qualified referrals). This POST accepts
  // only genuinely self-evident engagement quests (the floor-weight check-in /
  // read-chain). See W7 spec §6 + the security-first mandate.
  if (quest.protocolValuable) {
    return NextResponse.json(
      { error: "This quest is awarded automatically from verified on-chain activity, not self-claimed." },
      { status: 403 },
    );
  }

  const now = new Date();
  const windowKey = windowKeyFor(quest.cadence, now);
  // questId stores the catalog slug (no Quest FK — see schema).
  const baseAward = scoreForQuest(quest);
  const isCheckIn = quest.key === "daily_check_in";

  try {
    // Atomic: the completion, its ledger entry, and (for the daily check-in) the
    // streak update + bonus entry all commit or all roll back — no partial drift
    // in the eligibility ledger. The completion insert is the only
    // unique-constrained write and runs first, so a P2002 aborts the whole
    // transaction and maps unambiguously to 409 below.
    const result = await prisma.$transaction(async (tx) => {
      const completion = await tx.questCompletion.create({
        data: { userId, questId: quest.key, windowKey, awardedScore: baseAward },
      });
      await tx.scoreLedgerEntry.create({
        data: {
          userId,
          eventType: eventTypeForCadence(quest.cadence),
          scoreDelta: baseAward,
          relatedId: completion.id,
        },
      });

      let awardedScore = baseAward;
      let currentStreak = 0;
      if (isCheckIn) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { currentStreak: true, lastCheckInAt: true, longestStreak: true },
        });
        const last = user?.lastCheckInAt ?? null;
        const yesterday = new Date(now); yesterday.setUTCDate(now.getUTCDate() - 1);
        const continued = last && last.toISOString().slice(0, 10) === yesterday.toISOString().slice(0, 10);
        currentStreak = continued ? (user!.currentStreak + 1) : 1;
        const bonus = streakBonus(currentStreak);
        await tx.user.update({
          where: { id: userId },
          data: {
            currentStreak,
            longestStreak: Math.max(currentStreak, user?.longestStreak ?? 0),
            lastCheckInAt: now,
          },
        });
        if (bonus > 0) {
          await tx.scoreLedgerEntry.create({
            data: { userId, eventType: "STREAK_BONUS", scoreDelta: bonus, relatedId: completion.id },
          });
          awardedScore += bonus;
        }
      }
      return { awardedScore, currentStreak };
    });
    return NextResponse.json(result);
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Already completed this window" }, { status: 409 });
    }
    throw e;
  }
}
