"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { startDebugListener, stopDebugListener, subscribeDebug, getDebugEntries } from '@/lib/debugListener';

export default function DebugOverlay() {
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Subscribe to debug buffer
  const entries = useSyncExternalStore(subscribeDebug, getDebugEntries, getDebugEntries);

  // Start listener on mount
  useEffect(() => {
    startDebugListener();
    return () => stopDebugListener();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (!paused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, paused]);

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="fixed bottom-2 right-2 z-[200] px-2 py-1 rounded text-[10px] font-mono bg-black/80 text-green-400 border border-green-400/30 hover:bg-green-400/10"
      >
        DBG
      </button>
    );
  }

  const fmtTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`;
  };

  const labelColor = (label: string) => {
    if (label === 'system') return 'text-green-400';
    if (label === 'agents') return 'text-accent-cyan';
    if (label === 'energy' || label === 'minerals' || label === 'agntcBalance') return 'text-yellow-400';
    if (label === 'turn') return 'text-orange-400';
    if (label === 'haiku') return 'text-accent-purple';
    if (label.startsWith('current')) return 'text-pink-400';
    if (label === 'isInitializing' || label === 'chainMode') return 'text-blue-400';
    return 'text-text-muted';
  };

  return (
    <div className="fixed bottom-2 right-2 z-[200] w-[480px] max-h-[320px] flex flex-col rounded-lg border border-green-400/30 bg-black/90 backdrop-blur-sm shadow-lg font-mono text-[10px]">
      {/* Title bar */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-green-400/20 bg-green-400/5">
        <span className="text-green-400 font-bold tracking-wider">DEBUG LISTENER</span>
        <div className="flex items-center gap-1.5">
          <span className="text-text-muted">{entries.length} events</span>
          <button
            onClick={() => setPaused(p => !p)}
            className={`px-1.5 py-0.5 rounded text-[9px] border ${paused ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' : 'text-text-muted border-card-border hover:text-green-400'}`}
          >
            {paused ? 'PAUSED' : 'LIVE'}
          </button>
          <button
            onClick={() => setVisible(false)}
            className="text-text-muted hover:text-red-400 px-1"
          >
            {'\u2715'}
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1 space-y-px">
        {entries.length === 0 && (
          <div className="text-text-muted italic py-2">Waiting for store mutations...</div>
        )}
        {entries.map(e => (
          <div key={e.id} className="flex gap-2 leading-tight py-px hover:bg-green-400/5">
            <span className="text-text-muted/50 shrink-0">{fmtTime(e.ts)}</span>
            <span className={`shrink-0 w-24 truncate font-semibold ${labelColor(e.label)}`}>{e.label}</span>
            <span className="text-text-secondary truncate">{e.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
