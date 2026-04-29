import type { LatticeNode, LatticeStatus } from '../types';

/**
 * Generic data-source adapter for a 2D-lattice rendering. Apps implement this
 * to feed nodes into the canvas — read-only by contract; writes (claim, post,
 * deploy, etc.) are app-specific extensions on top.
 *
 * Both apps in the monorepo implement variants:
 *
 *   apps/game's AgentChainAdapter   extends ChainAdapter<Agent>
 *     and adds WRITE methods (claimNode, postHaiku, registerAgent, ...)
 *
 *   apps/timegrid's BitcoinChainAdapter  extends ChainAdapter<WalletNode>
 *     read-only by design (Bitcoin is observed, not written)
 *
 * Implementations are commonly:
 *   - a real backend client (TestnetChainService, BitcoinChainService)
 *   - an in-memory mock for offline / test mode (MockChainService)
 *   - a static-snapshot reader that fetches parquet from a CDN
 */
export interface ChainAdapter<TNode extends LatticeNode = LatticeNode> {
  /** Bulk-fetch all nodes currently visible on the lattice. */
  getNodes(): Promise<TNode[]>;

  /** Fetch the underlying chain's current status (block height, timing). */
  getStatus?(): Promise<LatticeStatus>;
}
