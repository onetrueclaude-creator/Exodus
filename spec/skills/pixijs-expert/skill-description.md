# PixiJS Expert — Deep Reference

> Skill for the ZkAgentic project.
> PixiJS version: **8.16.0**
> React version: **19.2.3**
> Context: WebGL-based agent network visualization game (graph with nodes + edges)
> Source: Official PixiJS 8.x documentation (https://pixijs.com/8.x/guides)

---

## 1. PixiJS 8 — Breaking Changes from v7

v8 is a major rewrite. These are the changes most likely to bite you.

| v7 API | v8 API | Notes |
|--------|--------|-------|
| `new Application({ ...options })` synchronous | `const app = new Application(); await app.init({ ...options })` | Async init required — WebGPU needs to await adapter |
| `interactive: true` | `eventMode: 'static'` | `interactive` removed entirely |
| `DisplayObject` base class | `Container` is the base class | `DisplayObject` is removed |
| `Graphics.beginFill(color)` → draw → `.endFill()` | draw shape → `.fill(color)` | Shape-first, then fill/stroke |
| `Graphics.drawCircle(x, y, r)` | `Graphics.circle(x, y, r)` | All draw* methods renamed — no `draw` prefix |
| `Graphics.drawRect(x, y, w, h)` | `Graphics.rect(x, y, w, h)` | Same pattern |
| `Graphics.lineStyle(width, color)` | `.stroke({ width, color })` after the shape | Stroke is applied after shape, not before |
| `GraphicsGeometry` for sharing | `GraphicsContext` | `new Graphics(context)` shares context |
| `beginHole()` / `endHole()` | `.cut()` | Called after shape, like `.fill()` |
| `PIXI.Loader` | `Assets` static singleton | Promise-based, cache-aware |
| `Ticker` callback receives `dt: number` | Ticker callback receives `ticker: Ticker` | Access `ticker.deltaTime`, `ticker.deltaMS` etc. |
| `updateTransform()` override | `this.onRender = () => {}` | For per-frame custom logic on display objects |
| `BaseTexture` | `TextureSource` variants | `ImageSource`, `CanvasSource`, `VideoSource`, etc. |
| `Texture.from('url')` loads from URL | Must load with `Assets.load()` first, then `Texture.from('url')` | `Texture.from` only accepts already-loaded sources |
| `settings.RESOLUTION = 1` | Pass to `renderer.init()` or `AbstractRenderer.defaultOptions.resolution` | `settings` removed |
| `SimpleMesh`, `SimplePlane`, `SimpleRope` | `MeshSimple`, `MeshPlane`, `MeshRope` | Renamed |
| `@pixi/app`, `@pixi/sprite` etc. | `pixi.js` (single package) | Sub-packages replaced |
| `ParticleContainer` accepts sprites | `ParticleContainer` requires `Particle` objects | Use `addParticle()`, not `addChild()` |
| `pointermove` fires globally | `pointermove` only fires when pointer is over object | Use `globalpointermove` for global behavior |

---

## 2. Application Setup (v8 Async Init)

```typescript
import { Application } from 'pixi.js'

const app = new Application()

// v8 REQUIRES await — this is the single most common migration mistake
await app.init({
  // Dimensions
  width: 1280,
  height: 720,

  // Or auto-resize to an element:
  resizeTo: containerElement,   // Window | HTMLElement

  // Color — accepts hex number, CSS string, or array
  background: '#0a0a0f',        // alias for backgroundColor
  backgroundColor: 0x0a0a0f,   // same thing

  // Renderer
  preference: 'webgl',          // 'webgl' | 'webgpu' — default: 'webgl'
  antialias: true,
  resolution: window.devicePixelRatio || 1,
  autoDensity: true,            // adjust canvas CSS size to match resolution

  // Performance
  powerPreference: 'high-performance', // GPU hint

  // Per-renderer overrides
  webgl: { antialias: true },
  webgpu: { antialias: false },
})

// The canvas element — append to DOM
document.body.appendChild(app.canvas)

// The root display container
const stage = app.stage   // Container
```

### Key ApplicationOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `width` | `number` | `800` | Renderer width in pixels |
| `height` | `number` | `600` | Renderer height in pixels |
| `resizeTo` | `Window \| HTMLElement` | — | Auto-resize to this element |
| `background` / `backgroundColor` | `ColorSource` | `'black'` | Canvas clear color |
| `backgroundAlpha` | `number` | `1` | Background alpha (0 = transparent) |
| `antialias` | `boolean` | — | Enable anti-aliasing |
| `resolution` | `number` | `1` | Pixel ratio |
| `autoDensity` | `boolean` | — | Scale canvas CSS size by `resolution` |
| `preference` | `'webgl' \| 'webgpu'` | `'webgl'` | Renderer preference |
| `autoStart` | `boolean` | `true` | Start ticker immediately |
| `sharedTicker` | `boolean` | `false` | Use the shared `Ticker.shared` |
| `powerPreference` | `'high-performance' \| 'low-power'` | — | GPU power hint |
| `clearBeforeRender` | `boolean` | `true` | Clear canvas each frame |
| `preserveDrawingBuffer` | `boolean` | `false` | Needed for `canvas.toDataURL()` |
| `textureGCActive` | `boolean` | `true` | Enable GPU texture GC |

---

## 3. React Integration Pattern

PixiJS must be initialized inside `useEffect` via a `ref` to a mount div. **Never** use PixiJS in Server Components or outside `useEffect`.

```typescript
// 'use client' — REQUIRED — PixiJS is browser-only
'use client'

import { useEffect, useRef, useCallback } from 'react'
import { Application, Container } from 'pixi.js'

export function GameCanvas() {
  const mountRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount || appRef.current) return   // guard against double-init (React Strict Mode)

    let cancelled = false
    let app: Application

    const init = async () => {
      app = new Application()
      await app.init({
        resizeTo: mount,
        background: '#0a0a0f',
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      })

      if (cancelled) {
        app.destroy(true)
        return
      }

      mount.appendChild(app.canvas)
      appRef.current = app
      // set up scene graph here...
    }

    init()

    return () => {
      cancelled = true
      if (appRef.current) {
        appRef.current.destroy(true)   // true = remove canvas from DOM
        appRef.current = null
      }
    }
  }, [])

  return <div ref={mountRef} className="w-full h-full" />
}
```

### Why `cancelled` flag matters

In React Strict Mode (development), effects run twice. The flag prevents `app.canvas` being appended to an already-destroyed app if the second init finishes after cleanup.

### `app.destroy()` signature

```typescript
app.destroy(
  removeView?: boolean,    // true = remove canvas from DOM
  options?: {
    children?: boolean,    // destroy all children
    texture?: boolean,     // destroy textures
    textureSource?: boolean,
  }
)
```

---

## 4. Vitest / jsdom: Mocking PixiJS

PixiJS crashes in jsdom (no WebGL context). Two strategies:

### Strategy A — Mock the whole module (for components that USE PixiJS)

```typescript
// In your test file or vitest.setup.ts
import { vi } from 'vitest'

vi.mock('pixi.js', () => ({
  Application: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
    stage: {
      addChild: vi.fn(),
      removeChild: vi.fn(),
      removeChildren: vi.fn(),
      on: vi.fn(),
    },
    ticker: {
      add: vi.fn(),
      remove: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    },
    canvas: document.createElement('canvas'),
    screen: { width: 800, height: 600 },
    renderer: { events: { cursorStyles: {} } },
  })),
  Container: vi.fn().mockImplementation(() => ({
    addChild: vi.fn(),
    removeChild: vi.fn(),
    removeChildren: vi.fn(),
    removeChildAt: vi.fn(),
    addChildAt: vi.fn(),
    on: vi.fn(),
    position: { set: vi.fn(), x: 0, y: 0 },
    scale: { set: vi.fn(), x: 1, y: 1 },
    alpha: 1,
    children: [],
    label: '',
    eventMode: 'passive',
    cursor: 'default',
  })),
  Graphics: vi.fn().mockImplementation(() => ({
    circle: vi.fn().mockReturnThis(),
    rect: vi.fn().mockReturnThis(),
    roundRect: vi.fn().mockReturnThis(),
    moveTo: vi.fn().mockReturnThis(),
    lineTo: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(),
    cut: vi.fn().mockReturnThis(),
    clear: vi.fn().mockReturnThis(),
    setStrokeStyle: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    position: { set: vi.fn() },
    alpha: 1,
    eventMode: 'passive',
  })),
  Text: vi.fn().mockImplementation(() => ({
    anchor: { set: vi.fn() },
    position: { set: vi.fn() },
    alpha: 1,
    text: '',
  })),
  Assets: {
    load: vi.fn().mockResolvedValue({}),
    get: vi.fn().mockReturnValue({}),
    init: vi.fn().mockResolvedValue(undefined),
    unload: vi.fn().mockResolvedValue(undefined),
  },
  Ticker: vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    remove: vi.fn(),
    addOnce: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    deltaTime: 1,
  })),
}))
```

### Strategy B — Test only pure PixiJS logic, not the renderer

Logic that only modifies `Container.alpha`, `.position`, `.scale` etc. can be tested without mocking if those properties exist on the real `Container`. The `starnode-dim.test.ts` pattern in ZkAgentic works because `Container` is importable and its properties are plain JavaScript — no WebGL required:

```typescript
// This works in jsdom — Container property mutation doesn't touch WebGL
import { Container } from 'pixi.js'
import { setNodeDimmed } from '@/components/grid/StarNode'

it('dims a container to 0.4 alpha', () => {
  const container = new Container()
  setNodeDimmed(container, true)
  expect(container.alpha).toBe(0.4)
})
```

Use Strategy B for functions that only manipulate object properties. Use Strategy A for components that call `app.init()`, `Assets.load()`, or anything that triggers WebGL.

---

## 5. Scene Graph — Container and Children

```typescript
import { Container } from 'pixi.js'

// Create a layered scene
const world = new Container()          // panned/zoomed root
const edgeLayer = new Container()     // render below nodes
const nodeLayer = new Container()     // interactive nodes
const uiLayer = new Container()       // heads-up display (fixed)

world.addChild(edgeLayer)
world.addChild(nodeLayer)
app.stage.addChild(world)
app.stage.addChild(uiLayer)           // uiLayer is NOT panned

// Useful Container properties
container.label = 'edges'             // name for debugging
container.alpha = 0.5                 // applies to all children
container.visible = false             // hides but keeps in scene graph
container.renderable = false          // skips rendering (cheaper for culling)
container.sortableChildren = true     // enables zIndex sorting
container.interactiveChildren = false // skip hit-testing children (perf)
container.cullable = true             // enable frustum culling
container.cullArea = new Rectangle(0, 0, 400, 400)  // custom cull bounds

// Transforms (all inherited from children)
container.position.set(x, y)
container.scale.set(1.5)             // uniform scale
container.scale.set(sx, sy)          // non-uniform
container.rotation = Math.PI / 4     // radians
container.pivot.set(50, 50)          // rotation pivot
```

---

## 6. Graphics API (v8 — Shape-First Model)

The v8 Graphics API completely changed the order of operations. In v7, you set fill/stroke style *before* drawing. In v8, you draw the shape *then* apply fill or stroke.

```typescript
import { Graphics, GraphicsContext } from 'pixi.js'

// Basic shapes — always: shape() then .fill() and/or .stroke()
const g = new Graphics()

// Circle
g.circle(cx, cy, radius).fill({ color: 0x4a9eff, alpha: 0.9 })

// Rectangle
g.rect(x, y, width, height).fill(0xff0000)  // shorthand: color only

// Rounded rectangle
g.roundRect(x, y, w, h, cornerRadius).fill(0x00ff00)

// Line between two points
g.moveTo(x1, y1).lineTo(x2, y2).stroke({ width: 2, color: 0xffffff, alpha: 0.5 })

// Arc
g.arc(cx, cy, radius, startAngle, endAngle, anticlockwise?)

// Polygon
g.poly([x1, y1, x2, y2, x3, y3]).fill(0x9b59b6)

// Star
g.star(cx, cy, points, outerRadius, innerRadius?, rotation?).fill(0xffd700)

// Ellipse
g.ellipse(cx, cy, halfWidth, halfHeight).fill(0x2ecc71)

// Chamfer rectangle (cut corners)
g.chamferRect(x, y, w, h, chamfer).fill(0x3498db)

// Fillet rectangle (rounded using inset arcs)
g.filletRect(x, y, w, h, fillet).fill(0xe74c3c)

// Regular polygon
g.regularPoly(cx, cy, radius, sides, rotation?).fill(0x1abc9c)
```

### Fill and Stroke styles

```typescript
// Fill with color only
g.circle(0, 0, 20).fill(0x4a9eff)

// Fill with full FillStyle
g.circle(0, 0, 20).fill({
  color: 0x4a9eff,
  alpha: 0.8,
  texture: myTexture,   // optional texture fill
})

// Stroke after fill
g.circle(0, 0, 20)
  .fill({ color: 0x4a9eff })
  .stroke({ color: 0xffffff, width: 2, alpha: 0.4 })

// Stroke only (no fill)
g.circle(0, 0, 20).stroke({ width: 1.5, color: 0x00d4ff, alpha: 0.7 })

// setStrokeStyle + moveTo/lineTo pattern (for complex paths)
g.setStrokeStyle({ width: 1, color: 0xffffff, alpha: 0.6 })
g.moveTo(0, 0)
g.lineTo(100, 100)
g.stroke()
```

### v7 → v8 method name mapping

| v7 | v8 |
|----|-----|
| `.drawCircle(x, y, r)` | `.circle(x, y, r)` |
| `.drawRect(x, y, w, h)` | `.rect(x, y, w, h)` |
| `.drawRoundedRect(x, y, w, h, r)` | `.roundRect(x, y, w, h, r)` |
| `.drawEllipse(x, y, hw, hh)` | `.ellipse(x, y, hw, hh)` |
| `.drawPolygon(points)` | `.poly(points)` |
| `.drawRegularPolygon(x, y, r, sides, rot)` | `.regularPoly(x, y, r, sides, rot)` |
| `.drawRoundedPolygon(...)` | `.roundPoly(...)` |
| `.drawStar(x, y, n, or, ir, rot)` | `.star(x, y, n, or, ir, rot)` |
| `.drawChamferRect(...)` | `.chamferRect(...)` |
| `.drawFilletRect(...)` | `.filletRect(...)` |
| `.beginFill(color, alpha)` | (removed — use `.fill()` after shape) |
| `.endFill()` | (removed) |
| `.lineStyle(width, color)` | (removed — use `.stroke()` after shape) |
| `.beginHole()` / `.endHole()` | `.cut()` after hole shape |
| `GraphicsGeometry` | `GraphicsContext` |

### Holes (cut-outs)

```typescript
// Create a rectangle with a circular hole
const g = new Graphics()
  .rect(0, 0, 100, 100)
  .fill(0x00ff00)
  .circle(50, 50, 20)
  .cut()               // removes the circle from the rect
```

### GraphicsContext — shared geometry (performance pattern)

```typescript
// Create a context once
const nodeContext = new GraphicsContext()
  .circle(0, 0, 24)
  .fill({ color: 0x4a9eff, alpha: 0.9 })
  .stroke({ color: 0xffffff, width: 2 })

// Reuse the same geometry for 1000 nodes — very cheap
const nodes = positions.map(() => new Graphics(nodeContext))

// Swap context dynamically (e.g. for animation frames)
const frames = [
  new GraphicsContext().circle(0, 0, 24).fill('blue'),
  new GraphicsContext().circle(0, 0, 28).fill('cyan'),
]
let graphic = new Graphics(frames[0])
app.ticker.add(() => {
  graphic.context = frames[tick % 2]  // cheap context swap
})
```

### Clearing and rebuilding

```typescript
// Clear all drawn content (prefer context swap over clear+redraw in loops)
g.clear()

// Destroy a Graphics object
g.destroy()

// Destroy a shared context (also invalidates all Graphics using it)
context.destroy()
shapeA.destroy({ context: true })  // destroys the shared context too
```

### Performance: do NOT rebuild Graphics every frame

```typescript
// BAD — creates new geometry every tick
app.ticker.add(() => {
  myGraphics.clear()
  myGraphics.circle(x, y, r).fill(0xff0000)  // expensive
})

// GOOD — mutate position/alpha, not geometry
app.ticker.add(() => {
  myGraphics.x = x
  myGraphics.y = y
  myGraphics.alpha = Math.sin(Date.now() * 0.001)
})

// ALSO GOOD — pre-build contexts and swap
const contextA = new GraphicsContext().circle(0, 0, 24).fill(0xff0000)
const contextB = new GraphicsContext().circle(0, 0, 32).fill(0x00ff00)
app.ticker.add(() => {
  myGraphics.context = condition ? contextA : contextB
})
```

---

## 7. Events and Interaction (v8 API)

### eventMode (replaces `interactive: true`)

| Mode | Hit testing | Emits events | Children interactive | Use when |
|------|-------------|--------------|----------------------|----------|
| `none` | No | No | No | Non-interactive, skip entirely |
| `passive` (default) | No | No | Yes | Container grouping |
| `auto` | Only if parent interactive | No | — | Inherits interactivity |
| `static` | Yes | Yes | — | Non-moving interactive objects (buttons, nodes) |
| `dynamic` | Yes | Yes (+ synthetic when idle) | — | Moving interactive objects (drag targets) |

```typescript
import { Graphics, FederatedPointerEvent } from 'pixi.js'

const node = new Graphics().circle(0, 0, 24).fill(0x4a9eff)

node.eventMode = 'static'   // required for events
node.cursor = 'pointer'      // CSS cursor string

// Pointer events (preferred — works for mouse AND touch)
node.on('pointerdown', (e: FederatedPointerEvent) => {
  console.log('pressed at', e.global.x, e.global.y)
})
node.on('pointerup', handler)
node.on('pointerupoutside', handler)  // released outside the object
node.on('pointermove', handler)       // only fires when pointer over object
node.on('pointerover', handler)
node.on('pointerout', handler)
node.on('pointerenter', handler)      // does not bubble
node.on('pointerleave', handler)      // does not bubble
node.on('pointertap', handler)        // quick tap
node.on('globalpointermove', handler) // fires on ALL moves, not just over object

// Mouse-specific events
node.on('click', handler)
node.on('mousedown', handler)
node.on('rightclick', handler)
node.on('wheel', handler)

// Remove listener
node.off('pointerdown', handler)

// Once
node.once('pointerdown', handler)

// DOM-style API also works
node.addEventListener('click', handler, { once: true })

// Callback style
node.onclick = (e) => { console.log('clicked') }
```

### Global events (replaces v7 global pointermove behavior)

In v7, `pointermove` fired for all moves on the canvas. In v8, it only fires when the pointer is over the specific object. For global behavior:

```typescript
// Attach to stage for global tracking
app.stage.eventMode = 'static'
app.stage.hitArea = app.screen  // make stage always catch events

app.stage.on('globalpointermove', (e: FederatedPointerEvent) => {
  const worldPos = e.getLocalPosition(world)
  setCursorCoords({ x: worldPos.x, y: worldPos.y })
})
```

### Custom hit area

```typescript
import { Rectangle, Circle } from 'pixi.js'

// Rectangle hit area (faster than bounds-based)
node.hitArea = new Rectangle(0, 0, 100, 100)

// Circle hit area
node.hitArea = new Circle(0, 0, 50)

// Skip children in hit testing
container.interactiveChildren = false
```

### Check interactivity

```typescript
if (node.isInteractive()) {
  // true only if eventMode is 'static' or 'dynamic'
}
```

### Drag and drop pattern

```typescript
let isDragging = false
let dragStart = { x: 0, y: 0 }

node.eventMode = 'dynamic'   // 'dynamic' for moving objects

node.on('pointerdown', (e: FederatedPointerEvent) => {
  isDragging = true
  const local = e.getLocalPosition(node.parent)
  dragStart = { x: node.x - local.x, y: node.y - local.y }
  e.stopPropagation()
})

// Use globalpointermove on the stage for smooth drag outside object bounds
app.stage.eventMode = 'static'
app.stage.hitArea = app.screen
app.stage.on('globalpointermove', (e: FederatedPointerEvent) => {
  if (!isDragging) return
  const pos = e.getLocalPosition(node.parent)
  node.x = pos.x + dragStart.x
  node.y = pos.y + dragStart.y
})

app.stage.on('pointerup', () => { isDragging = false })
app.stage.on('pointerupoutside', () => { isDragging = false })
```

---

## 8. Text

```typescript
import { Text, BitmapText } from 'pixi.js'

// Canvas-based text (flexible, slower to update)
const label = new Text({
  text: '★ Agent Alpha',
  style: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 12,
    fill: 0xffffff,        // accepts hex, CSS string
    align: 'center',
    fontWeight: 'bold',
    dropShadow: {
      color: 0x000000,
      blur: 4,
      distance: 2,
    },
  },
})
label.anchor.set(0.5)        // center pivot
label.anchor.set(0.5, 0)     // center horizontal, top vertical
label.position.set(x, y)
label.alpha = 0.8

// BitmapText — GPU-rendered, much faster for frequent updates
// Requires loading a bitmap font first
await Assets.load('fonts/inter.fnt')
const fastLabel = new BitmapText({
  text: 'Score: 1000',
  style: { fontFamily: 'Inter', fontSize: 24 },
})
```

**Performance rule**: avoid updating `Text.text` every frame — it re-rasterizes to a canvas texture each time. Use `BitmapText` for dynamic labels updated frequently.

---

## 9. Assets

```typescript
import { Assets, Sprite, Texture } from 'pixi.js'

// Initialize Assets (optional — sets base path, preferences)
await Assets.init({ basePath: '/assets' })

// Load a single asset
const texture = await Assets.load<Texture>('sprites/node.png')

// Load with alias
await Assets.load<Texture>({ alias: 'node', src: 'sprites/node.png' })
const tex = Assets.get('node')  // synchronous retrieval after load

// Load multiple assets
const textures = await Assets.load<Texture>([
  'sprites/node-a.png',
  'sprites/node-b.png',
])
// Result keyed by URL:
new Sprite(textures['sprites/node-a.png'])

// Load with progress callback
await Assets.load(
  ['a.png', 'b.png', 'c.png'],
  (progress) => console.log(`${Math.round(progress * 100)}% loaded`)
)

// Cache-safe: loading the same URL twice returns the same texture
const t1 = await Assets.load('hero.png')
const t2 = await Assets.load('hero.png')
console.log(t1 === t2)  // true

// Unload
await Assets.unload('sprites/node.png')
```

### Supported file types

| Type | Extensions |
|------|-----------|
| Textures | `.png`, `.jpg`, `.gif`, `.webp`, `.avif`, `.svg` |
| Sprite sheets | `.json` |
| Bitmap fonts | `.fnt`, `.xml`, `.txt` |
| Web fonts | `.ttf`, `.otf`, `.woff`, `.woff2` |
| Video textures | `.mp4`, `.webm`, `.ogg` |
| Compressed | `.basis`, `.dds`, `.ktx`, `.ktx2` |

---

## 10. Ticker and Game Loop

```typescript
import { Ticker, UPDATE_PRIORITY } from 'pixi.js'

// App ticker (the main loop tied to the Application)
app.ticker.add((ticker: Ticker) => {
  const dt = ticker.deltaTime    // frame-rate independent delta (1 = 60fps frame)
  const dtMS = ticker.deltaMS    // delta in milliseconds
  const elapsed = ticker.lastTime // total elapsed ms

  // Animate things
  sprite.rotation += 0.01 * dt
  edgeLayer.alpha = 0.5 + 0.3 * Math.sin(elapsed * 0.002)
})

// Cleanup (call in useEffect return)
const handler = (ticker: Ticker) => { /* ... */ }
app.ticker.add(handler)
app.ticker.remove(handler)

// Priority — higher number runs first
app.ticker.add(handler, null, UPDATE_PRIORITY.HIGH)   // 50
app.ticker.add(handler, null, UPDATE_PRIORITY.NORMAL) // 0 (default)
app.ticker.add(handler, null, UPDATE_PRIORITY.LOW)    // -50

// Standalone Ticker
const ticker = new Ticker()
ticker.add((t) => console.log(t.deltaTime))
ticker.autoStart = true   // starts when first listener is added
ticker.start()
ticker.stop()

// FPS control
ticker.maxFPS = 60   // cap at 60fps
ticker.minFPS = 30   // clamp slow frames (limits deltaTime)
ticker.maxFPS = 0    // unlimited

// Run once
ticker.addOnce(handler)
```

---

## 11. Sprite

```typescript
import { Assets, Sprite, Texture } from 'pixi.js'

// Pattern 1: Load first, then create
await Assets.load('sprites/agent.png')
const sprite = Sprite.from('sprites/agent.png')

// Pattern 2: Create from loaded texture
const texture = await Assets.load<Texture>('sprites/agent.png')
const sprite = new Sprite(texture)

// Properties
sprite.anchor.set(0.5)      // (0,0) = top-left, (0.5,0.5) = center
sprite.position.set(x, y)
sprite.scale.set(0.5)
sprite.rotation = Math.PI
sprite.alpha = 0.8
sprite.tint = 0xff8800      // multiply color tint (0xffffff = no tint)
sprite.visible = false

// Interaction
sprite.eventMode = 'static'
sprite.cursor = 'pointer'
sprite.on('pointerdown', handler)
```

---

## 12. ZkAgentic Graph Rendering Patterns

These patterns are derived from the actual codebase in `src/components/grid/`.

### Node as Container with layered Graphics

The preferred pattern for interactive nodes: a `Container` holds multiple `Graphics` objects for visual layers (glow, core, spikes) and interaction (hit area, hover ring). This matches `StarNode.ts`:

```typescript
import { Container, Graphics, Text } from 'pixi.js'

function createAgentNode(x: number, y: number, color: number, radius: number): Container {
  const container = new Container()
  container.position.set(x, y)

  // Large transparent hit area for easier clicking
  const hitArea = new Graphics()
    .circle(0, 0, radius * 3)
    .fill({ color: 0x000000, alpha: 0.001 })
  container.addChild(hitArea)

  // Outer glow (diffuse halo)
  const halo = new Graphics()
    .circle(0, 0, radius * 2.5)
    .fill({ color, alpha: 0.05 })
  container.addChild(halo)

  // Core disc
  const core = new Graphics()
    .circle(0, 0, radius * 0.35)
    .fill({ color, alpha: 0.8 })
  container.addChild(core)

  // White hot center
  const center = new Graphics()
    .circle(0, 0, radius * 0.15)
    .fill({ color: 0xffffff, alpha: 1.0 })
  container.addChild(center)

  // Hover ring (hidden by default)
  const hoverRing = new Graphics()
    .circle(0, 0, radius * 1.4)
    .stroke({ width: 1, color: 0xffffff, alpha: 0.35 })
  hoverRing.alpha = 0
  container.addChild(hoverRing)

  // Events
  container.eventMode = 'static'
  container.cursor = 'pointer'
  container.label = 'agent-node'   // for debugging

  container.on('pointerover', () => {
    hoverRing.alpha = 1
    container.scale.set(1.1)
  })
  container.on('pointerout', () => {
    hoverRing.alpha = 0
    container.scale.set(1)
  })

  return container
}
```

### Edge line rendering

From `ConnectionLine.ts` — edges are simple `Graphics` lines. Recreated when the graph changes:

```typescript
import { Graphics } from 'pixi.js'

function createConnectionLine(
  from: { x: number, y: number },
  to: { x: number, y: number },
  strength: number,  // 0.0 - 1.0
): Graphics {
  const alpha = Math.max(0.05, strength * 0.4)
  return new Graphics()
    .setStrokeStyle({ width: 1 + strength * 2, color: 0x00d4ff, alpha })
    .moveTo(from.x, from.y)
    .lineTo(to.x, to.y)
    .stroke()
}
```

### Pan and zoom world container

From `GalaxyGrid.tsx` — the entire graph lives in a `world` Container. Pan and zoom manipulate `world.position` and `world.scale`:

```typescript
const world = new Container()
app.stage.addChild(world)

let dragging = false
let dragStart = { x: 0, y: 0 }

app.canvas.addEventListener('pointerdown', (e: PointerEvent) => {
  dragging = true
  dragStart = { x: e.clientX - world.position.x, y: e.clientY - world.position.y }
})

app.canvas.addEventListener('pointermove', (e: PointerEvent) => {
  if (!dragging) return
  world.position.set(e.clientX - dragStart.x, e.clientY - dragStart.y)
})

app.canvas.addEventListener('pointerup', () => { dragging = false })

app.canvas.addEventListener('wheel', (e: WheelEvent) => {
  e.preventDefault()
  const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1
  const oldScale = world.scale.x
  const newScale = Math.min(3, Math.max(0.1, oldScale * scaleFactor))

  // Zoom toward cursor
  const rect = app.canvas.getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top
  world.position.x = mouseX - (mouseX - world.position.x) * (newScale / oldScale)
  world.position.y = mouseY - (mouseY - world.position.y) * (newScale / oldScale)
  world.scale.set(newScale)
}, { passive: false })
```

**Note**: pan/zoom uses native DOM events on `app.canvas`, not PixiJS events. This avoids the `eventMode` overhead for the background. Node clicks use PixiJS federated events on individual node containers.

### Batch-updating nodes (React-driven)

When React state changes (e.g. new agents), remove all node children and rebuild. Keep the background at index 0:

```typescript
// Clear all node/edge children but keep background (index 0)
while (world.children.length > 1) {
  world.removeChildAt(1)
}

// Rebuild from current state
for (const agent of Object.values(agents)) {
  const node = createAgentNode(agent.position.x, agent.position.y, ...)
  node.on('pointertap', () => onSelectAgent(agent.id))
  world.addChild(node)
}
```

---

## 13. Performance Best Practices

### General

- Group sprites of the same texture together — PixiJS batches up to 16 textures per draw call
- Order matters: `Sprite / Sprite / Graphics / Graphics` = 2 draw calls; `Sprite / Graphics / Sprite / Graphics` = 4 draw calls
- Use spritesheets (`.json` atlas) to minimize texture count

### Graphics

- Small Graphics objects (under ~100 points) are as fast as Sprites — they are batched on GPU
- Large complex Graphics objects are slower — convert to `RenderTexture` if static:
  ```typescript
  const renderTex = RenderTexture.create({ width: 200, height: 200 })
  app.renderer.render({ container: myComplexGraphics, target: renderTex })
  const sprite = new Sprite(renderTex)  // now rendered as a single texture
  ```
- Never call `g.clear()` and rebuild geometry in the game loop — mutate position/alpha instead

### Culling

Container culling is not automatic in v8 — you control when it runs:

```typescript
import { extensions, CullerPlugin, Culler } from 'pixi.js'

// Option A: Add CullerPlugin to Application (automatic each frame)
extensions.add(CullerPlugin)

// Option B: Manual culling (more control)
container.cullable = true
container.cullArea = new Rectangle(0, 0, 400, 400)  // custom bounds
const view = new Rectangle(0, 0, app.screen.width, app.screen.height)
Culler.shared.cull(world, view)
app.renderer.render(app.stage)

// Set individual objects as cullable
node.cullable = true
```

### Events

- Set `container.interactiveChildren = false` on containers whose children don't need events
- Use `hitArea` to avoid bounds calculation:
  ```typescript
  node.hitArea = new Rectangle(-radius, -radius, radius * 2, radius * 2)
  ```
- Use `eventMode: 'none'` on decorative objects (glow, halo, spikes)

### Memory

- Call `sprite.destroy()` and `graphics.destroy()` when removing objects permanently
- `texture.destroy()` frees GPU memory; stagger multiple destroys to avoid frame freezes
- Texture GC runs automatically every 600 frames by default (`textureGCCheckCountMax`)

---

## 14. Common Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot read properties of undefined (reading 'gl')` | jsdom has no WebGL | Mock `pixi.js` in Vitest (Strategy A above) |
| `app.init is not a function` | Using v7 constructor pattern | v8: `const app = new Application(); await app.init({})` |
| Objects not appearing | Wrong parent container | Check parent chain with `.label` property |
| Interaction not working | `eventMode` not set | Set `eventMode: 'static'` or `'dynamic'` |
| Memory leak on React remount | App not destroyed in cleanup | `app.destroy(true)` in `useEffect` return |
| `pointermove` not firing globally | v8 behavior change | Use `globalpointermove` event |
| `interactive: true` has no effect | v7 API removed | Use `eventMode: 'static'` |
| `beginFill` / `endFill` not working | v7 API removed | Use shape-first → `.fill()` pattern |
| `drawCircle` not a function | v7 API removed | Use `.circle()` |
| Click fires on drag end | Need to distinguish drag from click | Track `hasMoved` flag; check distance threshold |
| Ticker callback receives wrong arg | v7 passed `dt`, v8 passes `ticker` | `(ticker: Ticker) => { const dt = ticker.deltaTime }` |
| `Texture.from(url)` returns empty | URL not pre-loaded | `await Assets.load(url)` first |
