import type { ChainAdapter, LatticeStatus } from '@exodus/lattice-core';
import type { WalletNode, BlockActivity } from '@/types/wallet';
import type { BitcoinBlock } from '@/types/block';

/**
 * Fetches wallet/activity data from the offline-extracted parquet snapshots
 * served from our own CDN (Cloudflare R2 or equivalent). Never makes
 * per-block RPC calls or hits centralized APIs at runtime.
 *
 * This is a stub. Subsequent commits implement parquet fetching via DuckDB-Wasm
 * and wire keyframe interpolation through a Web Worker.
 */
export class BitcoinChainAdapter implements ChainAdapter<WalletNode> {
  constructor(private readonly cdnBase: string) {}

  async getNodes(): Promise<WalletNode[]> {
    // TODO: fetch wallets.parquet, parse via DuckDB-Wasm, return WalletNode[]
    return [];
  }

  async getStatus(): Promise<LatticeStatus> {
    // TODO: fetch /status.json (tiny, frequently refreshed)
    return { currentBlock: 0 };
  }

  async getActivity(_height: number): Promise<BlockActivity | null> {
    // TODO: fetch activity.parquet shard for the epoch containing this block
    return null;
  }

  async getBlock(_height: number): Promise<BitcoinBlock | null> {
    // TODO: fetch block-metadata.parquet shard
    return null;
  }
}
