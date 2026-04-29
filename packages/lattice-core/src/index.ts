// @exodus/lattice-core — barrel exports
//
// This package houses 2D-lattice rendering primitives shared between:
//   - apps/game     (zkagenticnetwork: agentic chain testnet game UI)
//   - apps/timegrid (Bitcoin wallet civilization viewer)
//
// Migration of files from apps/game/src/ proceeds bottom-up: leaf utilities
// and contract types first, then UI components, then PixiJS canvas, then the
// hoisted sync hook. apps/game retains its working duplicates until a
// later commit flips its imports — no behavior change at any step.

// Types
export type { GridPosition, LatticeNode, LatticeStatus } from './types';

// Data adapters
export type { ChainAdapter } from './data/ChainAdapter';

// Coordinate mapping
export {
  chainToVisual,
  visualToChain,
  makeCoordMap,
  DEFAULT_CHAIN_GRID_MIN,
  DEFAULT_CHAIN_GRID_MAX,
  DEFAULT_CHAIN_GRID_SPAN,
  DEFAULT_VISUAL_HALF,
  DEFAULT_VISUAL_SPAN,
  type CoordMapConfig,
  type CoordMap,
} from './coords/chainToVisual';

// Utilities
export { sciFormat, sciRate } from './util/format';
export { getDistance, getConnectionStrength } from './util/proximity';
