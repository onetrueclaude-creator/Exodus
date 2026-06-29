"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store";
import { formatDelta } from "@/lib/format";

/** Flash delta indicator — shows +N or -N for 3 seconds after a resource change */
export function DeltaFlash({ resourceKey }: { resourceKey: string }) {
  const delta = useGameStore((s) => s.resourceDeltas[resourceKey]);
  // Track the most recently DISMISSED delta. Visibility is DERIVED from it, so the
  // effect never calls setState synchronously (no cascading renders) — it only
  // schedules the auto-hide. A fresh delta shows immediately; it hides after 3s.
  const [dismissedTs, setDismissedTs] = useState<number | null>(null);

  useEffect(() => {
    if (!delta) return;
    const ts = delta.ts;
    const timer = setTimeout(() => setDismissedTs(ts), 3000);
    return () => clearTimeout(timer);
  }, [delta]);

  if (!delta || delta.ts === dismissedTs) return null;

  const isPositive = delta.value > 0;
  return (
    <span
      className={`text-[10px] font-mono font-bold animate-pulse ${
        isPositive ? "text-green-400" : "text-red-400"
      }`}
    >
      {formatDelta(delta.value)}
    </span>
  );
}
