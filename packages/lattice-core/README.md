# @exodus/lattice-core

Shared 2D-lattice rendering primitives extracted from `apps/game/`. Consumed by both `apps/game` and `apps/timegrid`.

## Why this package exists

Two apps in this monorepo need to render a pannable, zoomable 2D grid of nodes with a dock-panel UI: the agentic-chain game (`apps/game`, zkagenticnetwork.com) and the Bitcoin wallet visualization (`apps/timegrid`, planned). Rather than duplicate the PixiJS canvas, dock pattern, dark-theme CSS, coordinate transforms, and chain-adapter contract, this package owns those primitives once.

The data and the gameplay differ between the two apps. The framework — how to render a node, how the camera works, how the dock toggles, how a chain-data adapter looks — is identical, and lives here.

## What's inside (after migration)

```
src/
├── canvas/          PixiJS Application + node renderers (sphere, star)
├── ui/              DockPanel, TabNavigation, HoverTooltip
├── coords/          chainToVisual, visualToChain, lattice math
├── data/            ChainAdapter interface, useChainSync hook
├── theme/           globals.css (dark crypto palette)
└── util/            format, proximity helpers
```

Currently the package is a skeleton — see commit history for the migration steps.

## Consumption

Both apps import from the package root:

```ts
import { LatticeCanvas, DockPanel, type ChainAdapter } from '@exodus/lattice-core';
import '@exodus/lattice-core/theme/globals.css';
```

## Testing

```bash
npm run test:run --workspace=@exodus/lattice-core
```

Tests stub PixiJS sub-components (canvas/WebGL is unavailable in jsdom).
