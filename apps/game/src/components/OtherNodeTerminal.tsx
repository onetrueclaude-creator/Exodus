"use client";

import { useState } from "react";
import { useGameStore } from "@/store";
import { getNodeTier, NODE_TIER_ACCENT, TIER_DISPLAY_NAME } from "@/lib/nodeTier";
import { getWalletIndex } from "@/lib/walletIndex";
import { postTransact } from "@/services/testnetApi";
import type { Agent } from "@/types";
import type { ChainService } from "@/services/chainService";

interface OtherNodeTerminalProps {
  /** The focused other-player node. */
  agent: Agent;
  /** The player's own active agent (NCP sender). Null if none. */
  myAgent: Agent | null;
  chainService: ChainService | null;
  onClose: () => void;
}

type Tab = "scan" | "transact" | "ncp" | "planets";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "scan", label: "Scan", icon: "◎" },
  { id: "transact", label: "Transact", icon: "◈" },
  { id: "ncp", label: "NCP", icon: "✉" },
  { id: "planets", label: "Planets", icon: "◉" },
];

/**
 * Intel + interact console for ANOTHER player's node (focus routes here when the
 * focused node is not the player's own). Keyed to the OTHER node's tier colour so
 * it reads as "their" terminal, distinct from your own command console.
 */
export default function OtherNodeTerminal({ agent, myAgent, chainService, onClose }: OtherNodeTerminalProps) {
  const nodeTier = getNodeTier(agent.level);
  const accent = NODE_TIER_ACCENT[nodeTier]; // e.g. text-accent-purple
  const tierName = TIER_DISPLAY_NAME[nodeTier];
  const owner = agent.username?.trim() || `Agent ${agent.id.slice(0, 6)}`;

  const flashDelta = useGameStore((s) => s.flashDelta);

  const [tab, setTab] = useState<Tab>("scan");
  const [amount, setAmount] = useState("");
  const [ncp, setNcp] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const doTransact = async () => {
    if (!agent.username) { setStatus("Owner name unavailable — cannot transact."); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setStatus("Enter a valid amount."); return; }
    setBusy(true); setStatus(null);
    try {
      const result = await postTransact(getWalletIndex(), { recipientName: owner, amount: amt });
      flashDelta("agntc", -(amt + result.fee));
      setStatus(`Sent ${result.amount} AGNTC → ${owner}. Fee ${result.fee.toFixed(4)} (50% burned).`);
      setAmount("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transfer failed";
      setStatus(/zero balance|unspent|insufficient/i.test(msg)
        ? "No spendable AGNTC yet — Secure to earn some first."
        : `Transfer failed: ${msg}`);
    } finally { setBusy(false); }
  };

  const doSendNcp = async () => {
    const text = ncp.trim();
    if (!text) return;
    if (!myAgent) { setStatus("No home node — cannot transmit."); return; }
    setBusy(true); setStatus(null);
    try {
      if (chainService && "sendMessage" in chainService) {
        const svc = chainService as ChainService;
        await svc.sendMessage(myAgent.position, { x: agent.position.x, y: agent.position.y }, text);
      }
      setStatus(`NCP transmitted to ${owner}. Delivery confirmed.`);
      setNcp("");
    } catch (err) {
      setStatus(`NCP failed: ${err instanceof Error ? err.message : "error"}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="neural-terminal flex flex-col w-full h-full overflow-hidden">
      {/* Header — keyed to THEIR tier colour so it reads as a foreign node */}
      <div className="shrink-0 px-3.5 py-3 border-b border-card-border/60">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] text-text-muted/70 font-mono">Foreign node</div>
            <div className={`text-[15px] font-semibold truncate ${accent}`} style={{ fontFamily: "'Outfit', sans-serif" }}>
              {owner}
            </div>
            <div className="text-[11px] text-text-muted font-mono mt-0.5">
              {tierName} · Lv {agent.level}{agent.tier ? ` · ${agent.tier}` : ""}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-text-muted/60 hover:text-text-secondary text-lg leading-none"
            aria-label="Close"
          >
            {"×"}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="shrink-0 flex gap-1 px-2.5 py-2 border-b border-card-border/40">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setStatus(null); }}
            className={`flex-1 px-2 py-1.5 rounded-md text-[11px] font-mono border transition-colors ${
              tab === t.id
                ? `${accent} bg-white/[0.06] border-white/15`
                : "text-text-muted/60 border-transparent hover:text-text-secondary hover:bg-white/5"
            }`}
          >
            <span className="mr-1">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div
        className="flex-1 min-h-0 overflow-y-auto px-3.5 py-3 text-[13px] text-text-secondary"
        style={{ fontFamily: "'Fira Code', monospace" }}
      >
        {tab === "scan" && (
          <dl className="space-y-2">
            <ScanRow label="Owner" value={owner} accent={accent} />
            <ScanRow label="Node tier" value={`${tierName} (Lv ${agent.level})`} />
            {agent.tier && <ScanRow label="Identity" value={agent.tier} />}
            {agent.rank != null && <ScanRow label="Orbital rank" value={`#${agent.rank}`} />}
            {agent.activity != null && <ScanRow label="Activity" value={agent.activity.toFixed(2)} />}
            {agent.density != null && <ScanRow label="Density" value={`${(agent.density * 100).toFixed(0)}%`} />}
            <ScanRow label="Content planets" value={`${agent.planets.length}`} />
          </dl>
        )}

        {tab === "transact" && (
          <div className="space-y-3">
            <p className="text-[12px] text-text-muted">Send AGNTC to <span className={accent}>{owner}</span>.</p>
            <input
              type="number" inputMode="decimal" min="0" value={amount}
              onChange={(e) => setAmount(e.target.value)} placeholder="Amount (AGNTC)"
              className="w-full px-3 py-2 rounded-lg bg-background/60 border border-card-border/50 text-[13px] text-text-primary placeholder:text-text-muted/40 focus:border-accent-cyan/50 outline-none font-mono"
            />
            <button
              onClick={doTransact} disabled={busy || !amount}
              className="w-full px-4 py-2 rounded-lg text-[12px] font-semibold bg-yellow-400/10 text-yellow-400 border border-yellow-400/25 hover:bg-yellow-400/20 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            >
              {busy ? "Transmitting…" : "Execute Transfer"}
            </button>
          </div>
        )}

        {tab === "ncp" && (
          <div className="space-y-3">
            <p className="text-[12px] text-text-muted">Neural packet to <span className={accent}>{owner}</span>.</p>
            <textarea
              value={ncp} onChange={(e) => setNcp(e.target.value.slice(0, 140))} rows={3}
              placeholder="Encode neural packet…"
              className="w-full px-3 py-2 rounded-lg bg-background/60 border border-card-border/50 text-[13px] text-text-primary placeholder:text-text-muted/40 focus:border-accent-purple/50 outline-none resize-none break-words"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-text-muted/50 font-mono">{ncp.length}/140</span>
              <button
                onClick={doSendNcp} disabled={busy || !ncp.trim()}
                className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-accent-purple/10 text-accent-purple border border-accent-purple/25 hover:bg-accent-purple/20 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              >
                {busy ? "Sending…" : "Transmit"}
              </button>
            </div>
          </div>
        )}

        {tab === "planets" && (
          <div className="space-y-2">
            {agent.planets.length === 0 ? (
              <p className="text-[12px] text-text-muted/70 italic">No published content yet.</p>
            ) : (
              <>
                <p className="text-[12px] text-text-muted">
                  {agent.planets.length} content {agent.planets.length === 1 ? "planet" : "planets"} orbiting this node:
                </p>
                <ul className="space-y-1">
                  {agent.planets.map((p) => (
                    <li key={p} className="px-2.5 py-1.5 rounded-md bg-white/[0.03] border border-card-border/30 text-[11px] font-mono text-text-secondary break-all">
                      {p}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>

      {/* Status line */}
      {status && (
        <div className="shrink-0 px-3.5 py-2 border-t border-card-border/40 text-[11px] text-text-muted font-mono break-words">
          {status}
        </div>
      )}
    </div>
  );
}

function ScanRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-card-border/20 pb-1.5">
      <dt className="text-[11px] text-text-muted/70 shrink-0">{label}</dt>
      <dd className={`text-[12px] text-right break-words ${accent ?? "text-text-secondary"}`}>{value}</dd>
    </div>
  );
}
