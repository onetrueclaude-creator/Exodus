"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

type Status = "idle" | "connecting" | "signing" | "binding" | "bound" | "error";

const toHex = (u: Uint8Array) =>
  Array.from(u).map((b) => b.toString(16).padStart(2, "0")).join("");

/**
 * Drives the Hollow-DB → On-chain upgrade: connect Phantom, fetch a SIWS
 * challenge, sign it off-chain, and submit the binding. On success the caller
 * should refetch /api/me so isOnChain flips. See spec §7 / §16.4.
 */
export function useBindWallet(onBound?: () => void) {
  const { connected, publicKey, signMessage, connect } = useWallet();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const bind = useCallback(async () => {
    setError(null);
    try {
      if (!connected) { setStatus("connecting"); await connect(); }
      if (!publicKey || !signMessage) throw new Error("Phantom unavailable");
      const pubkey = publicKey.toBase58();

      const chRes = await fetch("/api/wallet/challenge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pubkey }),
      });
      if (!chRes.ok) throw new Error("challenge failed");
      const { message } = await chRes.json();

      setStatus("signing");
      const sig = await signMessage(new TextEncoder().encode(message));

      setStatus("binding");
      const bindRes = await fetch("/api/wallet/bind", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pubkey, signature: toHex(sig) }),
      });
      if (!bindRes.ok) throw new Error((await bindRes.json().catch(() => ({}))).error ?? "bind failed");

      setStatus("bound");
      onBound?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "binding failed");
      setStatus("error");
    }
  }, [connected, publicKey, signMessage, connect, onBound]);

  return { bind, status, error };
}
