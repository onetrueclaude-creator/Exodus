import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** A single line in an agent terminal's conversation. */
export interface ChatMessage {
  id: string;
  role: "user" | "agent" | "system";
  content: string;
  timestamp: number;
}

interface TerminalState {
  /** Per-NODE message history (keyed by agent/node id) — so each node's
   *  terminal has its OWN chat, not a shared global feed. */
  messagesByNode: Record<string, ChatMessage[]>;
  addMessage: (nodeId: string, msg: ChatMessage) => void;
  /** Seed a node's greeting once; no-op if it already has history. */
  seedNode: (nodeId: string, msgs: ChatMessage[]) => void;
  clearNode: (nodeId: string) => void;
}

// SSR-safe storage: localStorage on the client, a no-op shim on the server so
// the module can be imported during SSR without throwing.
const safeStorage = createJSONStorage(() => {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  // SSR or a test env without localStorage: a no-op shim keeps the store usable.
  return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
});

/**
 * Persistent, per-node agent-terminal chat. Backed by localStorage so the full
 * chronological history for each node survives refreshes, logout/login, and
 * crashes (same browser). Keyed by node id so an action on one node never leaks
 * into another node's terminal.
 */
export const useTerminalStore = create<TerminalState>()(
  persist(
    (set) => ({
      messagesByNode: {},
      addMessage: (nodeId, msg) =>
        set((s) => ({
          messagesByNode: {
            ...s.messagesByNode,
            [nodeId]: [...(s.messagesByNode[nodeId] ?? []), msg],
          },
        })),
      seedNode: (nodeId, msgs) =>
        set((s) =>
          s.messagesByNode[nodeId]?.length
            ? s
            : { messagesByNode: { ...s.messagesByNode, [nodeId]: msgs } },
        ),
      clearNode: (nodeId) =>
        set((s) => {
          const next = { ...s.messagesByNode };
          delete next[nodeId];
          return { messagesByNode: next };
        }),
    }),
    {
      name: "zkagentic-terminal-chat",
      storage: safeStorage,
      version: 1,
    },
  ),
);
