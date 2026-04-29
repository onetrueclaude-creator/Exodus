/**
 * Generic types shared across the lattice rendering layer.
 * Apps extend these with domain-specific fields.
 */

/** A 2D coordinate in the visual (rendering) coordinate space. */
export interface GridPosition {
  x: number;
  y: number;
}

/**
 * Minimum shape every node on the lattice has. Apps extend this with their
 * own domain-specific node type:
 *   - apps/game extends with { tier, planets, borderRadius, ... } (Agent)
 *   - apps/timegrid extends with { holdings, firstSeen, lastActive, ... } (Wallet)
 */
export interface LatticeNode {
  /** Stable identifier (address hash, agent id, etc.) */
  id: string;
  /** Visual position on the rendered lattice. */
  position: GridPosition;
}

/** A snapshot of the underlying chain's progression, used by the dock UI. */
export interface LatticeStatus {
  /** Current block / generation / cycle number. */
  currentBlock: number;
  /** Wall-clock timestamp of the most recent block, in ms since epoch. */
  lastBlockTime?: number;
  /** Cycle hint for the dock — display "next block in X seconds". */
  nextBlockEtaMs?: number;
}
