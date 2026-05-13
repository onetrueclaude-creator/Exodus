"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store";

/** Flash delta indicator — shows +N or -N for 3 seconds after a resource change */
export function DeltaFlash({ resourceKey }: { resourceKey: string }) {
  const delta = useGameStore((s) => s.resourceDeltas[resourceKey]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!delta) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [delta?.ts]);

  if (!visible || !delta) return null;

  const isPositive = delta.value > 0;
  return (
    <span
      className={`text-[10px] font-mono font-bold animate-pulse ${
        isPositive ? "text-green-400" : "text-red-400"
      }`}
    >
      {isPositive ? "+" : ""}
      {delta.value}
    </span>
  );
}
