"use client";

import { useGameStore } from "@/store";

/**
 * Permanent, un-losable Genesis-cohort badge (W7 §4). Latecomers cannot
 * replicate it. Identity-only — carries no value/price claim.
 */
export default function GenesisBadge() {
  const batch = useGameStore((s) => s.genesisCohortBatch);
  if (batch == null) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2 py-0.5 text-xs font-semibold text-cyan-300"
      title="Permanent Genesis-cohort member"
    >
      ✦ Genesis · Batch {batch}
    </span>
  );
}
