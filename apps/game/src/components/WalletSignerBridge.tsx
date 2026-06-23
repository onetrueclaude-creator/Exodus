"use client";

import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { setWriteSigner } from "@/lib/writeSigner";

/** Bridges the React wallet context into the plain writeSigner module so
 * testnetApi can Phantom-sign writes. Registers when connected, clears otherwise. */
export default function WalletSignerBridge() {
  const { publicKey, signMessage, connected } = useWallet();
  useEffect(() => {
    if (connected && publicKey && signMessage) {
      setWriteSigner({ pubkeyBase58: publicKey.toBase58(), signMessage });
    } else {
      setWriteSigner(null);
    }
    return () => setWriteSigner(null);
  }, [connected, publicKey, signMessage]);
  return null;
}
