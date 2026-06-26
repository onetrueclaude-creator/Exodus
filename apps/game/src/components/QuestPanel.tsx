"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store";
import { DISCLOSURES } from "@/lib/disclosures";

interface QuestRow {
  key: string;
  cadence: "DAILY" | "WEEKLY" | "MILESTONE";
  title: string;
  description: string;
  protocolValuable: boolean;
  completedThisWindow: boolean;
}

export default function QuestPanel() {
  const active = useGameStore((s) => s.activeDockPanel) === "quests";
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/quests");
        const data = await res.json();
        if (!alive) return;
        setQuests(data.quests ?? []);
        setStreak(data.currentStreak ?? 0);
      } catch { /* offline: leave empty */ }
    })();
    return () => { alive = false; };
  }, [active]);

  if (!active) return null;

  const complete = async (key: string) => {
    // Defense-in-depth: protocol-valuable quests are NEVER self-attested (the
    // server 403s them — they're awarded by verified on-chain activity). The Do
    // button is already hidden for them; this guard keeps the invariant if any
    // future caller invokes complete() with such a key.
    const target = quests.find((q) => q.key === key);
    if (target?.protocolValuable) return;
    const res = await fetch("/api/quests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) });
    if (!res.ok) return; // surface nothing on a rejected completion; leave state as-is
    const refreshed = await fetch("/api/quests");
    const data = await refreshed.json();
    setQuests(data.quests ?? []);
    setStreak(data.currentStreak ?? 0);
  };

  const byCadence = (c: QuestRow["cadence"]) => quests.filter((q) => q.cadence === c);

  return (
    <div className="p-4 text-sm h-full overflow-y-auto">
      <h2 className="mb-2 text-base font-semibold">Quests</h2>
      <p className="mb-3 text-xs text-cyan-300">Streak: {streak} day(s)</p>
      {(["DAILY", "WEEKLY", "MILESTONE"] as const).map((c) => (
        <section key={c} className="mb-3">
          <h3 className="mb-1 text-xs uppercase tracking-wide text-neutral-400">{c.toLowerCase()}</h3>
          <ul className="space-y-1">
            {byCadence(c).map((q) => (
              <li key={q.key} className="flex items-center justify-between gap-2">
                <span className={q.completedThisWindow ? "text-neutral-500 line-through" : ""}>{q.title}</span>
                {q.completedThisWindow ? null : q.protocolValuable ? (
                  // Protocol-valuable quests are awarded automatically by trusted server-side
                  // verifiers of real on-chain activity — never self-attested (would 403).
                  <span
                    className="text-[10px] text-neutral-500 italic"
                    title="Awarded automatically from verified on-chain activity"
                  >
                    auto
                  </span>
                ) : (
                  <button className="dock-icon" onClick={() => complete(q.key)}>Do</button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="mt-2 border-t border-neutral-700 pt-2 text-[10px] leading-snug text-neutral-400">
        {DISCLOSURES.testnetToken}
      </p>
    </div>
  );
}
