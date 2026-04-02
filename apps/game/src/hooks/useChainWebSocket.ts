import { useEffect, useRef, useCallback } from "react";
import { useGameStore } from "@/store";
import * as api from "@/services/testnetApi";

const WS_BASE = (process.env.NEXT_PUBLIC_TESTNET_API ?? "http://localhost:8080").replace(
  /^http/,
  "ws"
);

interface WsMessage {
  event: string;
  data: Record<string, unknown>;
}

/**
 * Connects to the testnet WebSocket and dispatches events to the Zustand store.
 * Reconnects with exponential backoff on disconnect.
 * Falls back to HTTP polling if WebSocket is unavailable.
 */
export function useChainWebSocket(enabled: boolean) {
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(1000); // initial retry delay
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const handleMessage = useCallback((event: MessageEvent) => {
    let msg: WsMessage;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }

    const store = useGameStore.getState();

    switch (msg.event) {
      case "block_mined": {
        const d = msg.data as {
          block_number: number;
          yields: Record<string, number>;
          verification_outcome: string;
          verifiers_assigned: number;
          valid_proofs: number;
        };

        const prevBlocks = store.testnetBlocks;
        store.setChainMode("testnet", d.block_number);

        // Spawn new blocknodes for each new block since last known state
        for (let b = prevBlocks; b < d.block_number; b++) {
          store.addBlocknodesForBlock(b);
        }

        // Refresh agents from chain after a block
        api
          .getClaims()
          .then(() => {
            // Full refresh via testnet service will happen on next sync
          })
          .catch(() => {});
        break;
      }
      case "agent_born": {
        // A new star system was created — trigger refresh
        // The game page's syncFromChain will pick it up
        break;
      }
      case "pong":
        // Heartbeat response — no action needed
        break;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) return; // already polling
    pollRef.current = setInterval(async () => {
      if (!enabledRef.current) return;
      try {
        const status = await api.getStatus();
        useGameStore.getState().setChainMode("testnet", status.blocks_processed);
      } catch {
        // Testnet unreachable — will retry next interval
      }
    }, 60000);
  }, []);

  const connect = useCallback(() => {
    if (!enabledRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(`${WS_BASE}/ws`);

      ws.onopen = () => {
        retryRef.current = 1000; // reset backoff
        // Stop polling fallback if running
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        // Send initial ping
        ws.send(JSON.stringify({ type: "ping" }));
      };

      ws.onmessage = handleMessage;

      ws.onclose = () => {
        wsRef.current = null;
        if (!enabledRef.current) return;
        // Exponential backoff reconnect (max 30s)
        const delay = Math.min(retryRef.current, 30000);
        retryRef.current = delay * 2;
        timerRef.current = setTimeout(connect, delay);
        // Start polling fallback while disconnected
        startPolling();
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    } catch {
      // WebSocket constructor failed — fall back to polling
      startPolling();
    }
  }, [handleMessage, startPolling]);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      enabledRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [enabled, connect]);
}
