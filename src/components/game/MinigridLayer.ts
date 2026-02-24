import { Container, Graphics } from 'pixi.js'
import { type FogLevel } from '@/lib/spiral/SpiralClassifier'

export interface MinigridCellData {
  fillRatio: number   // 0..1 — how full this blockchain slot is
  hasData: boolean    // true = data packet written on-chain
}

export interface SubCellRect {
  x: number; y: number; width: number; height: number; col: number; row: number
}

export interface MacroCellRenderData {
  macroX: number
  macroY: number
  macroSize: number
  fogLevel: FogLevel
  factionColor: number
  slots: MinigridCellData[]
}

export class MinigridLayer {
  private container: Container
  private graphics: Graphics

  constructor() {
    this.container = new Container()
    this.graphics = new Graphics()
    this.container.addChild(this.graphics)
  }

  get displayObject(): Container { return this.container }

  // ─── Pure static helpers (unit-testable, no PixiJS) ───────────────────────

  static computeSubCells(
    originX: number,
    originY: number,
    macroSize: number,
  ): SubCellRect[] {
    const sub = macroSize / 8
    const cells: SubCellRect[] = []
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        cells.push({
          x: originX + col * sub,
          y: originY + row * sub,
          width: sub,
          height: sub,
          col,
          row,
        })
      }
    }
    return cells
  }

  static clampFill(v: number): number {
    return Math.max(0, Math.min(1, v))
  }

  static cellAlpha(fogLevel: FogLevel, fillRatio: number): number {
    if (fogLevel === 'hidden') return 0
    const fill = MinigridLayer.clampFill(fillRatio)
    if (fogLevel === 'clear') {
      return 0.12 + fill * (0.88)   // 0.12 (empty) → 1.0 (full)
    }
    // hazy
    return 0.04 + fill * 0.18       // 0.04 (empty) → 0.22 (full) — always dimmer than clear
  }

  // ─── PixiJS rendering ─────────────────────────────────────────────────────

  render(cells: MacroCellRenderData[], zoom: number): void {
    this.graphics.clear()
    if (zoom < 3) return

    for (const cell of cells) {
      const subs = MinigridLayer.computeSubCells(cell.macroX, cell.macroY, cell.macroSize)
      for (let i = 0; i < subs.length; i++) {
        const sub = subs[i]
        const data = cell.slots[i] ?? { fillRatio: 0, hasData: false }
        const alpha = MinigridLayer.cellAlpha(cell.fogLevel, data.fillRatio)
        if (alpha <= 0) continue

        this.graphics
          .rect(sub.x + 1, sub.y + 1, sub.width - 2, sub.height - 2)
          .fill({ color: cell.factionColor, alpha })
      }
    }
  }
}
