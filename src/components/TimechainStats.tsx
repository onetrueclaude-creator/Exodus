"use client";

import { useEffect, useState } from 'react';
import { useGameStore } from '@/store';

/** Right-side panel showing live blockchain statistics */
export default function TimechainStats() {
  const chainMode = useGameStore((s) => s.chainMode);
  const testnetBlocks = useGameStore((s) => s.testnetBlocks);
  const stateRoot = useGameStore((s) => s.stateRoot);
  const nextBlockIn = useGameStore((s) => s.nextBlockIn);
  const totalMined = useGameStore((s) => s.totalMined);

  // Genesis timestamp — fixed for testnet
  const [genesis] = useState(() => {
    // Use a stored genesis or current session start
    const stored = typeof window !== 'undefined' && sessionStorage.getItem('genesis_ts');
    if (stored) return new Date(stored);
    const now = new Date();
    if (typeof window !== 'undefined') sessionStorage.setItem('genesis_ts', now.toISOString());
    return now;
  });

  // Live countdown to next block
  const [countdown, setCountdown] = useState(Math.ceil(nextBlockIn));
  useEffect(() => {
    setCountdown(Math.ceil(nextBlockIn));
    const timer = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [nextBlockIn]);

  // Epochs = blocks / 10 (approx)
  const epochs = Math.floor(testnetBlocks / 10);

  if (chainMode !== 'testnet') return null;

  return (
    <div className="w-full bg-background-light/90 border border-card-border rounded-lg p-3">
      <div className="text-[10px] font-bold tracking-wider text-text-muted mb-2">
        TIMECHAIN STATS
      </div>

      <div className="space-y-1.5">
        <StatRow label="Network" value="TESTNET" valueClass="text-yellow-400" />
        <StatRow
          label="Genesis"
          value={genesis.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) + ' ' + genesis.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' })}
        />
        <StatRow label="Epochs" value={epochs.toLocaleString()} />
        <StatRow label="Blocks" value={testnetBlocks.toLocaleString()} />
        <StatRow label="Mined" value={totalMined.toLocaleString()} />
        <StatRow
          label="Next Block"
          value={`~${countdown}s`}
          valueClass="text-green-400 tabular-nums"
        />
        {stateRoot && (
          <StatRow
            label="State"
            value={stateRoot.slice(0, 8) + '...'}
            valueClass="text-text-muted/50"
          />
        )}
      </div>
    </div>
  );
}

function StatRow({ label, value, valueClass = 'text-text-secondary' }: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[10px] text-text-muted/60">{label}</span>
      <span className={`text-[11px] font-mono ${valueClass}`}>{value}</span>
    </div>
  );
}
