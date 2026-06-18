"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store";
import { inspectorModelFor } from "@/lib/inspectorModel";
import { SINGULARITY_ID } from "@/lib/orbitalSeats";

/** Singularity protocol-core operations (vault-backed; currently stubbed). */
const SINGULARITY_OPS = ["Secure", "Read", "Stats"] as const;
type SingularityOp = (typeof SINGULARITY_OPS)[number];

/** Format the 0xRRGGBB tint as a CSS hex colour for swatches/accents.
 *  Defensive: an unknown/undefined tint falls back to a neutral slate. */
function tintToCss(tint: number | undefined): string {
  return `#${(tint ?? 0x64748b).toString(16).padStart(6, "0")}`;
}

/**
 * Top-right collapsible "toast" inspector for the focused orbital node.
 * Store-driven (`focusedNodeId`): a player/subagent shows tier · rank · band · owner,
 * the Singularity shows the protocol-core blurb + Secure/Read/Stats ops. Renders
 * nothing when no node is focused. Mirrors the timechaingraph collapsible inspector feel.
 */
export default function NodeInspector() {
  const focusedNodeId = useGameStore((s) => s.focusedNodeId);
  const agents = useGameStore((s) => s.agents);
  const setFocusedNode = useGameStore((s) => s.setFocusedNode);
  const addInteractionEdge = useGameStore((s) => s.addInteractionEdge);

  const [minimized, setMinimized] = useState(false);
  // Transient log line for the last Singularity op (auto-clears).
  const [log, setLog] = useState<string | null>(null);
  // The node the local UI state (minimize/log) currently belongs to. When the
  // focus changes we reset during render — the React-recommended alternative to a
  // setState-in-effect (https://react.dev/learn/you-might-not-need-an-effect).
  const [uiNode, setUiNode] = useState<string | null>(focusedNodeId);
  if (uiNode !== focusedNodeId) {
    setUiNode(focusedNodeId);
    setMinimized(false);
    setLog(null);
  }

  // Auto-dismiss the op toast after a moment (effect only synchronizes a timer).
  useEffect(() => {
    if (!log) return;
    const t = window.setTimeout(() => setLog(null), 2600);
    return () => window.clearTimeout(t);
  }, [log]);

  const model = inspectorModelFor(focusedNodeId, agents);
  if (!model) return null;

  const close = () => setFocusedNode(null);

  // Collapsed chip — a compact accent dot + a restore affordance.
  if (minimized) {
    return (
      <button
        type="button"
        aria-label="Expand node inspector"
        onClick={() => setMinimized(false)}
        className="absolute top-24 right-2 z-[25] flex items-center gap-1.5 glass-panel-floating px-2.5 py-1.5 text-[10px] font-mono text-text-muted hover:text-text-primary transition-colors animate-slide-left"
      >
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ backgroundColor: tintToCss(model.tint) }}
        />
        {model.kind === "singularity" ? "Singularity" : model.title}
      </button>
    );
  }

  const runOp = (op: SingularityOp) => {
    const self = Object.values(agents).find((a) => a.isSelf);
    if (self) {
      // Draw a decaying link from the player's homenode to the protocol core.
      // TODO(proof-of-vault): wire to real vault op
      addInteractionEdge(self.id, SINGULARITY_ID);
      setLog(`${op} → Singularity · link sent`);
    } else {
      setLog(`${op} → no homenode to link from`);
    }
  };

  return (
    <div
      className="absolute top-24 right-2 z-[25] w-[208px] glass-panel-floating p-3 animate-slide-left"
      role="dialog"
      aria-label="Node inspector"
    >
      {/* header: accent dot + title + minimize/close */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: tintToCss(model.tint) }}
          />
          <span className="text-[11px] font-bold tracking-wide text-text-primary truncate font-mono">
            {model.kind === "singularity"
              ? "SINGULARITY"
              : `${model.crown ? model.crown + " " : ""}${model.title}`}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            aria-label="Minimize inspector"
            onClick={() => setMinimized(true)}
            className="text-text-muted hover:text-text-primary text-xs leading-none px-1"
          >
            –
          </button>
          <button
            type="button"
            aria-label="Close inspector"
            onClick={close}
            className="text-text-muted hover:text-text-primary text-xs leading-none px-1"
          >
            ✕
          </button>
        </div>
      </div>

      {model.kind === "singularity" ? (
        <div className="space-y-2">
          <div className="text-[10px] text-text-muted leading-snug">{model.subtitle}</div>
          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            {SINGULARITY_OPS.map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => runOp(op)}
                className="text-[10px] font-semibold py-1 rounded border border-card-border text-accent-cyan hover:bg-accent-cyan/10 transition-colors"
              >
                {op}
              </button>
            ))}
          </div>
          {log && (
            <div className="text-[10px] font-mono text-emerald-400/90 pt-0.5">{log}</div>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {model.isSelf && (
            <div className="text-[10px] font-bold text-accent-cyan mb-1.5 tracking-wide">
              ★ YOUR HOMENODE
            </div>
          )}
          <InspectorRow label="Tier" value={`${model.crown ? model.crown + " " : ""}${model.tierLabel}`} />
          <InspectorRow label="Kind" value={model.kind === "subagent" ? "Subagent" : "Player"} />
          <InspectorRow label="Rank" value={`#${model.rank}`} />
          <InspectorRow label="Band" value={String(model.band)} />
          <InspectorRow label="Activity" value={String(model.activity)} />
          <InspectorRow label="Owner" value={model.owner} mono />
        </div>
      )}
    </div>
  );
}

function InspectorRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-[10px] text-text-muted/70">{label}</span>
      <span
        className={`text-[11px] text-text-primary ${mono ? "font-mono" : "font-semibold"} tabular-nums truncate`}
      >
        {value}
      </span>
    </div>
  );
}
