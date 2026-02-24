import { describe, it, expect } from 'vitest'
import { MinigridLayer } from '@/components/game/MinigridLayer'

describe('MinigridLayer (static logic — no PixiJS instantiation in unit tests)', () => {
  it('generates exactly 64 sub-cell positions for a macro cell', () => {
    const cells = MinigridLayer.computeSubCells(0, 0, 80)
    expect(cells).toHaveLength(64)
  })

  it('sub-cells tile the macro cell — correct size and no gaps', () => {
    const cells = MinigridLayer.computeSubCells(10, 20, 80)
    const subSize = 80 / 8
    expect(cells[0].x).toBeCloseTo(10)
    expect(cells[0].y).toBeCloseTo(20)
    expect(cells[0].width).toBeCloseTo(subSize)
    expect(cells[0].height).toBeCloseTo(subSize)
    // last cell (row 7, col 7)
    expect(cells[63].x).toBeCloseTo(10 + 7 * subSize)
    expect(cells[63].y).toBeCloseTo(20 + 7 * subSize)
  })

  it('clampFill clamps to 0..1', () => {
    expect(MinigridLayer.clampFill(1.5)).toBe(1)
    expect(MinigridLayer.clampFill(-0.2)).toBe(0)
    expect(MinigridLayer.clampFill(0.5)).toBe(0.5)
  })

  it('cellAlpha returns 0 for hidden fog regardless of fill', () => {
    expect(MinigridLayer.cellAlpha('hidden', 1)).toBe(0)
    expect(MinigridLayer.cellAlpha('hidden', 0)).toBe(0)
  })

  it('cellAlpha for clear empty slot is dim but non-zero', () => {
    const alpha = MinigridLayer.cellAlpha('clear', 0)
    expect(alpha).toBeGreaterThan(0)
    expect(alpha).toBeLessThan(0.3)
  })

  it('cellAlpha for clear full slot is bright', () => {
    const alpha = MinigridLayer.cellAlpha('clear', 1)
    expect(alpha).toBeGreaterThan(0.7)
    expect(alpha).toBeLessThanOrEqual(1)
  })

  it('cellAlpha for hazy is dimmer than clear at same fill', () => {
    const hazyClear = MinigridLayer.cellAlpha('clear', 0.5)
    const hazyHazy = MinigridLayer.cellAlpha('hazy', 0.5)
    expect(hazyHazy).toBeLessThan(hazyClear)
  })
})
