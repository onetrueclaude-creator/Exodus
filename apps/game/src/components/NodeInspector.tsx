"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store";
import { inspectorModelFor } from "@/lib/inspectorModel";
import { SINGULARITY_ID } from "@/lib/orbitalSeats";
import { getWalletIndex } from "@/lib/walletIndex";
import { runRead, runStats, runSecure } from "@/lib/vaultGate";
import type { ChainService } from "@/services/chainService";

/**
 * Singularity gate operations (Proof-of-Vault backed).
 *  - Secure: the PoAW gate — browser builds a possession proof over its held
 *    shard and submits it; an accepted proof credits CPU + draws the success edge.
 *  - Read:   inspect the vault root + this wallet's assigned shards.
 *  - Stats:  this wallet's securing history.
 */
const SINGULARITY_OPS = ["Secure", "Read", "Stats"] as const;
type SingularityOp = (typeof SINGULARITY_OPS)[number];

interface NodeInspectorProps {
  /** Active chain service (testnet or mock) — null until the game resolves it. */
  chainService?: ChainService | null;
}

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
export default function NodeInspector({ chainService }: NodeInspectorProps = {}) {
  const focusedNodeId = useGameStore((s) => s.focusedNodeId);
  const agents = useGameStore((s) => s.agents);
  const setFocusedNode = useGameStore((s) => s.setFocusedNode);
  const addInteractionEdge = useGameStore((s) => s.addInteractionEdge);

  const [minimized, setMinimized] = useState(false);
  // Transient log line for the last Singularity op (auto-clears).
  const [log, setLog] = useState<string | null>(null);
  // The op currently in flight (disables buttons + shows a spinner-ish hint).
  const [running, setRunning] = useState<SingularityOp | null>(null);
  // Multi-line detail block from the last Read/Stats/Secure op.
  const [detail, setDetail] = useState<string[] | null>(null);
  // Severity of the last log line, so failures render red and passes green.
  const [logTone, setLogTone] = useState<"ok" | "err">("ok");
  // The node the local UI state (minimize/log) currently belongs to. When the
  // focus changes we reset during render — the React-recommended alternative to a
  // setState-in-effect (https://react.dev/learn/you-might-not-need-an-effect).
  const [uiNode, setUiNode] = useState<string | null>(focusedNodeId);
  if (uiNode !== focusedNodeId) {
    setUiNode(focusedNodeId);
    setMinimized(false);
    setLog(null);
    setDetail(null);
    setRunning(null);
  }

  // Auto-dismiss the op toast after a moment (effect only synchronizes a timer).
  // The detail block persists (it carries the Read/Stats/Secure result the user
  // is reading); only the transient one-line status auto-clears.
  useEffect(() => {
    if (!log) return;
    const t = window.setTimeout(() => setLog(null), 4000);
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

  const short = (cid: string) =>
    cid.length > 14 ? `${cid.slice(0, 8)}…${cid.slice(-4)}` : cid;

  const setOk = (line: string, lines?: string[]) => {
    setLogTone("ok");
    setLog(line);
    if (lines !== undefined) setDetail(lines);
  };
  const setErr = (line: string) => {
    setLogTone("err");
    setLog(line);
  };

  const runOp = async (op: SingularityOp) => {
    if (running) return; // one op at a time
    if (!chainService) {
      setErr(`${op} → chain offline`);
      return;
    }
    const walletIndex = getWalletIndex();
    setRunning(op);
    setDetail(null);
    try {
      if (op === "Read") {
        const r = await runRead(chainService, walletIndex);
        setOk("Vault read", [
          `root ${short(r.rootCid)}`,
          `${r.atomCount} atoms · ${r.shardCount} shards · x${r.replicationFactor}`,
          r.shards.length
            ? `your shards: ${r.shards.join(", ")}`
            : "no shards assigned",
        ]);
      } else if (op === "Stats") {
        const s = await runStats(chainService, walletIndex);
        setOk("Securing stats", [
          s.shards.length ? `shards: ${s.shards.join(", ")}` : "no shards",
          `last pass: ${s.lastPassBlock ?? "—"}`,
          `secured passes: ${s.securedPasses}`,
        ]);
      } else {
        // Secure — the PoAW gate. The browser proves possession of its shard.
        const res = await runSecure(chainService, walletIndex);
        if (res.ok) {
          // Success signal: draw the decaying edge to the Singularity, gated on
          // a real accepted proof (no longer a stub).
          const self = Object.values(agents).find((a) => a.isSelf);
          if (self) addInteractionEdge(self.id, SINGULARITY_ID);
          setOk("Proof accepted ✓", [
            `shard ${res.shardId} · block ${res.issuedBlock}`,
            `+${res.cpuCredit} CPU credit`,
            res.fromCache ? "proved from held shard" : "shard fetched + cached",
          ]);
        } else {
          setErr(`Secure → ${res.reason}`);
        }
      }
    } catch (e) {
      setErr(`${op} → ${e instanceof Error ? e.message : "failed"}`);
    } finally {
      setRunning(null);
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
              : model.kind === "player"
                ? `${model.crown ? model.crown + " " : ""}${model.title}`
                : model.title /* subagent — tier-less, no crown */}
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
          {/* Honest framing: this is the obedience-proof gate. Secure submits a
              possession proof of the player's held shard — NOT a ZK proof. */}
          <div className="text-[9px] font-mono uppercase tracking-wide text-accent-cyan/70">
            obedience-proof gate · possession proof
          </div>
          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            {SINGULARITY_OPS.map((op) => (
              <button
                key={op}
                type="button"
                disabled={running !== null}
                onClick={() => runOp(op)}
                title={
                  op === "Secure"
                    ? "Prove possession of your vault shard through the gate"
                    : op === "Read"
                      ? "Read the vault root + your assigned shards"
                      : "Your securing history"
                }
                className="text-[10px] font-semibold py-1 rounded border border-card-border text-accent-cyan hover:bg-accent-cyan/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {running === op ? "…" : op}
              </button>
            ))}
          </div>
          {detail && (
            <div className="text-[10px] font-mono text-text-primary/90 leading-snug space-y-0.5 pt-0.5">
              {detail.map((line, i) => (
                <div key={i} className="truncate">{line}</div>
              ))}
            </div>
          )}
          {log && (
            <div
              className={`text-[10px] font-mono pt-0.5 ${
                logTone === "err" ? "text-rose-400/90" : "text-emerald-400/90"
              }`}
            >
              {log}
            </div>
          )}
        </div>
      ) : model.kind === "player" ? (
        <div className="space-y-1">
          {model.isSelf && (
            <div className="text-[10px] font-bold text-accent-cyan mb-1.5 tracking-wide">
              ★ YOUR HOMENODE
            </div>
          )}
          <InspectorRow label="Tier" value={`${model.crown ? model.crown + " " : ""}${model.tierLabel}`} />
          <InspectorRow label="Kind" value="Player" />
          <InspectorRow label="Rank" value={`#${model.rank}`} />
          <InspectorRow label="Band" value={String(model.band)} />
          <InspectorRow label="Activity" value={String(model.activity)} />
          <InspectorRow label="Owner" value={model.owner} mono />
        </div>
      ) : (
        /* Subagent — tier-less: no Tier row. Shows owner + the parent it belongs to. */
        <div className="space-y-1">
          <InspectorRow label="Kind" value="Subagent" />
          <InspectorRow label="Parent" value={model.parent} mono />
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
