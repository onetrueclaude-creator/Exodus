import { useEffect, useRef } from "react";
import { useGameStore } from "@/store";
import * as api from "@/services/testnetApi";
import { getWalletIndex } from "@/lib/walletIndex";

/**
 * Subscribes to the gateway's SSE block feed (/api/chain/events) and updates the
 * store on each new block. Replaces the direct browser→chain WebSocket (B2):
 * the browser never opens a socket to the chain.
 */
export function useChainEvents(enabled: boolean) {
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const es = new EventSource("/api/chain/events");
    esRef.current = es;

    es.onmessage = (event) => {
      let msg: { event: string; data: { block_number: number } };
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.event !== "block_mined") return;

      const store = useGameStore.getState();
      const prev = store.testnetBlocks;
      const n = msg.data.block_number;
      store.setChainMode("testnet", n);
      for (let b = prev; b < n; b++) store.addBlocknodesForBlock(b);

      api.getStatus().then((status) => {
        useGameStore.getState().setChainStatus({
          poolRemaining: status.circulating_supply,
          totalMined: status.total_mined,
          stateRoot: status.state_root,
          nextBlockIn: status.next_block_in,
          blocks: status.blocks_processed,
          epochRing: status.epoch_ring,
          hardness: status.hardness,
        });
      }).catch(() => {});

      api.getSettings(getWalletIndex()).then((settings) => {
        useGameStore.getState().setWalletState({
          securedChains: settings.total_secured_chains,
          minedChains: settings.total_mined_chains,
          securingRate: settings.securing_rate,
          miningRate: settings.mining_rate,
          effectiveStake: settings.effective_stake,
        });
      }).catch(() => {});
    };

    es.onerror = () => {
      // EventSource auto-reconnects; nothing to do.
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [enabled]);
}
