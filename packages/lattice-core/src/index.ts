// @exodus/lattice-core — barrel exports
//
// This package houses 2D-lattice rendering primitives shared between:
//   - apps/game     (zkagenticnetwork: agentic chain testnet game UI)
//   - apps/timegrid (Bitcoin wallet civilization viewer)
//
// At bootstrap (this commit) the package is empty. Subsequent commits
// migrate code from apps/game/src/ in this order:
//   1. util/format, util/proximity                  (zero-coupling helpers)
//   2. coords/chainToVisual, coords/lattice         (pure functions)
//   3. data/ChainAdapter (interface only)           (contract type)
//   4. theme/globals.css                            (CSS, no logic)
//   5. ui/DockPanel, ui/TabNavigation, ui/HoverTooltip
//   6. canvas/SphereNode, canvas/LatticeCanvas      (parameterized renderers)
//   7. data/useChainSync                            (hoisted hook)
//
// The contract: apps/game's behavior must be unchanged at every step.

export {};
