"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store";
import { DISCLOSURES } from "@/lib/disclosures";
import { truncateOwnerHex, type LeaderboardRow } from "@/lib/timeLedger";
import type { ChainService } from "@/services/chainService";

/** Full public tenure ranking (spec §2.1): every participant, ranked by √-influence,
 *  showing BOTH raw epochs-of-service and the √-weight, by username, own row
 *  highlighted. owner_hex → username joins against the already-fetched agent
 *  window (chain-resolved owner_name); truncated owner_hex is the honest fallback. */
export default function TenurePanel({ chainService }: { chainService: ChainService | null }) {
  const active = useGameStore((s) => s.activeDockPanel) === "tenure";
  const agents = useGameStore((s) => s.agents);
  const myOwnerHex = useGameStore((s) => s.timeStatus?.ownerHex ?? null);
  // null = not loaded / unreachable (never render an empty board as "loaded").
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);

  useEffect(() => {
    if (!active || !chainService) return;
    let alive = true;
    (async () => {
      try {
        const board = await chainService.getTimeLeaderboard();
        if (alive) setRows(board);
      } catch {
        // Offline / unreachable — leave null; the panel shows "unavailable".
      }
    })();
    return () => { alive = false; };
  }, [active, chainService]);

  if (!active) return null;

  // owner_hex → username from the agent window (Agent.userId === owner_hex).
  const nameByOwner = new Map<string, string>();
  for (const a of Object.values(agents)) {
    if (a.userId && a.username) nameByOwner.set(a.userId, a.username);
  }

  return (
    <div className="p-4 text-sm h-full overflow-y-auto">
      <h2 className="mb-1 text-base font-semibold">Tenure Leaderboard</h2>
      <p className="mb-3 text-xs text-text-muted/70">
        Epochs of verified service, ranked by {"√"}tenure influence.
      </p>
      {rows === null ? (
        <p className="text-xs text-text-muted/60">Ranking unavailable {"—"} connect to testnet.</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-text-muted/60">No service history recorded yet.</p>
      ) : (
        <ol className="space-y-1">
          {rows.map((row, i) => {
            const isSelf = myOwnerHex !== null && row.ownerHex === myOwnerHex;
            const name = nameByOwner.get(row.ownerHex) ?? truncateOwnerHex(row.ownerHex);
            return (
              <li
                key={row.ownerHex}
                data-testid={isSelf ? "tenure-row-self" : "tenure-row"}
                className={`flex items-center justify-between gap-2 rounded px-2 py-1 ${
                  isSelf ? "bg-accent-cyan/[0.08] border border-accent-cyan/30" : "border border-transparent"
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-text-muted/50 font-mono tabular-nums w-6 text-right">{i + 1}</span>
                  <span className={`font-mono truncate ${isSelf ? "text-accent-cyan" : "text-text-primary"}`}>
                    {name}{isSelf ? " (you)" : ""}
                  </span>
                </span>
                <span className="flex items-center gap-3 shrink-0 font-mono tabular-nums">
                  <span className="text-indigo-300" title="epochs of service (raw tenure)">{row.timeAccrued} ep</span>
                  <span className="text-accent-purple/80" title="√-tenure influence (rank weight)">
                    {"√"}{row.influence.toFixed(2)}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      <p className="mt-3 border-t border-card-border pt-2 text-[10px] leading-snug text-text-muted/70">
        Tenure is a soulbound count of epochs of verified service {"—"} never spent, sold, or
        exchanged; it gates node levels and weights ranking. {DISCLOSURES.testnetToken}
      </p>
    </div>
  );
}
