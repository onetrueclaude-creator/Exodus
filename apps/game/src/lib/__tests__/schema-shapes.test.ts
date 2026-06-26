import { describe, it, expect } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { QuestCadence, ScoreEventType } from "@/generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Structural shape tests — prove the W7 delegates and enums exist on the
// generated Prisma client after `npx prisma generate`.
//
// Adapter note: Prisma 7's driver-adapter generator requires an adapter at
// construction time. We instantiate exactly as src/lib/prisma.ts does —
// PrismaPg over a pg.Pool with a dummy connection string. The pool is lazy: no
// query is executed, so no DB socket is opened. This relies only on the repo's
// DIRECT deps (pg, @prisma/adapter-pg), not a transitive package.
describe("W7 prisma model surface", () => {
  it("exposes quest, referral and score-ledger delegates", () => {
    const adapter = new PrismaPg(new pg.Pool({ connectionString: "postgresql://localhost:5432/dummy" }));
    const p = new PrismaClient({ adapter });
    expect(typeof p.quest).toBe("object");
    expect(typeof p.questCompletion).toBe("object");
    expect(typeof p.referral).toBe("object");
    expect(typeof p.referralCredit).toBe("object");
    expect(typeof p.scoreLedgerEntry).toBe("object");
  });

  it("QuestCadence enum has the three tiers", () => {
    expect(QuestCadence.DAILY).toBe("DAILY");
    expect(QuestCadence.WEEKLY).toBe("WEEKLY");
    expect(QuestCadence.MILESTONE).toBe("MILESTONE");
  });

  it("ScoreEventType carries the protocol + referral event kinds", () => {
    expect(ScoreEventType.SECURE).toBe("SECURE");
    expect(ScoreEventType.QUEST_WEEKLY).toBe("QUEST_WEEKLY");
    expect(ScoreEventType.REFERRAL_CREDIT).toBe("REFERRAL_CREDIT");
  });
});
