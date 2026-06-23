"use client";

import { useBindWallet } from "@/hooks/useBindWallet";

/**
 * Minimal Hollow-DB → On-chain affordance. Placement is intentionally minimal
 * for B4a; the onboarding-integrated flow is sub-project C. `isOnChain` comes
 * from /api/me; `onBound` lets the parent refetch it.
 */
export default function ConnectWalletButton({
  isOnChain, onBound,
}: { isOnChain: boolean; onBound?: () => void }) {
  const { bind, status, error } = useBindWallet(onBound);

  if (isOnChain) {
    return <span className="text-[11px] font-mono text-accent-cyan/80">● On-chain</span>;
  }

  const busy = status === "connecting" || status === "signing" || status === "binding";
  const label =
    status === "connecting" ? "Connecting…" :
    status === "signing" ? "Sign in Phantom…" :
    status === "binding" ? "Binding…" : "Connect Wallet";

  return (
    <span className="flex items-center gap-2">
      <button
        onClick={() => void bind()}
        disabled={busy}
        className="px-3 py-1 rounded-md text-[11px] font-semibold bg-accent-purple/15 text-accent-purple border border-accent-purple/30 hover:bg-accent-purple/25 disabled:opacity-40 transition-colors"
      >
        {label}
      </button>
      {error && <span className="text-[10px] text-red-400 font-mono">{error}</span>}
    </span>
  );
}
