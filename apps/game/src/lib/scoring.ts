// W7 scoring — protocol-valuable behavior is weighted 5-10x over engagement
// theater (spec §6). Value-neutral: scores are airdrop-ELIGIBILITY weights,
// never a token amount or a value claim (disclosure snippet #1 applies).

export type QuestCadence = "DAILY" | "WEEKLY" | "MILESTONE";

export interface QuestDef {
  key: string;
  cadence: QuestCadence;
  title: string;
  description: string;
  baseScore: number;
  /** true = node uptime/securing/bug-report/governance; false = check-in/social */
  protocolValuable: boolean;
}

export const ENGAGEMENT_WEIGHT = 1;
export const PROTOCOL_WEIGHT = 8; // within the spec's 5-10x band

export const QUEST_CATALOG: QuestDef[] = [
  // DAILY — lightweight habit; engagement theater = floor weight
  { key: "daily_check_in", cadence: "DAILY", title: "Daily check-in", description: "Open the network and check in.", baseScore: 1, protocolValuable: false },
  { key: "daily_read_chain", cadence: "DAILY", title: "Scan the chain", description: "Read on-chain data from any node.", baseScore: 1, protocolValuable: false },
  // WEEKLY — substantive protocol knowledge
  { key: "weekly_secure", cadence: "WEEKLY", title: "Secure a block cycle", description: "Run a Secure action on chain.", baseScore: 5, protocolValuable: true },
  { key: "weekly_governance_vote", cadence: "WEEKLY", title: "Cast a governance vote", description: "Vote on an open governance item.", baseScore: 5, protocolValuable: true },
  { key: "weekly_bug_report", cadence: "WEEKLY", title: "File a bug report", description: "Report a verified bug.", baseScore: 6, protocolValuable: true },
  // MILESTONE — deep; filters builders
  { key: "milestone_node_uptime", cadence: "MILESTONE", title: "7-day node uptime", description: "Keep a node securing for 7 consecutive days.", baseScore: 20, protocolValuable: true },
  { key: "milestone_verified_referrals", cadence: "MILESTONE", title: "3 qualified referrals", description: "Refer 3 users who each pass 30-day real activity.", baseScore: 25, protocolValuable: true },
];

export function scoreForQuest(q: QuestDef): number {
  return q.baseScore * (q.protocolValuable ? PROTOCOL_WEIGHT : ENGAGEMENT_WEIGHT);
}

/**
 * Light, capped streak bonus — light actions keep the chain alive (spec §6).
 * Logarithmic by design so a long streak can never dwarf real protocol work:
 * the EFFECTIVE ceiling is ~28 for any human streak length (e.g. 10k days → 28;
 * a single weekly_secure already scores 40). The `Math.min(50, …)` is a hard
 * backstop, not the operative cap — it is unreachable below ~2^24 days, so do
 * NOT treat 50 as the design ceiling. Tune the *base formula*, not the backstop,
 * if the bonus ever needs to be larger.
 */
export function streakBonus(streakDays: number): number {
  if (streakDays <= 0) return 0;
  return Math.min(50, Math.ceil(Math.log2(streakDays + 1)) * 2);
}

export function windowKeyFor(cadence: QuestCadence, now: Date): string {
  if (cadence === "MILESTONE") return "";
  if (cadence === "DAILY") return now.toISOString().slice(0, 10);
  // ISO-week for WEEKLY
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
