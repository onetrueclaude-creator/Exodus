import { describe, it, expect } from 'vitest'
import { classifyCell, type Faction } from '@/lib/spiral/SpiralClassifier'

describe('SpiralClassifier', () => {
  it('classifies origin as free_community clear', () => {
    const r = classifyCell(0, 0, 'free_community')
    expect(r.faction).toBe('free_community')
    expect(r.fogLevel).toBe('clear')
    expect(r.armStrength).toBe(1)
  })

  it('classifies north cell (0,5) as free_community for free_community user', () => {
    const r = classifyCell(0, 5, 'free_community')
    expect(r.faction).toBe('free_community')
    expect(r.fogLevel).toBe('clear')
  })

  it('classifies east cell (5,0) as treasury — hazy for free_community user', () => {
    const r = classifyCell(5, 0, 'free_community')
    expect(r.faction).toBe('treasury')
    expect(r.fogLevel).toBe('hazy')
  })

  it('classifies south cell (0,-5) as founder_pool — hazy', () => {
    const r = classifyCell(0, -5, 'free_community')
    expect(r.faction).toBe('founder_pool')
    expect(r.fogLevel).toBe('hazy')
  })

  it('classifies 45° diagonal as treasury (CW arm wins)', () => {
    // 45° is exactly between N arm (free_community, 90°) and E arm (treasury, 0°).
    // With ARM_HALF_WIDTH=45° and tiny CW bias, treasury (the CW arm) wins.
    const r = classifyCell(5, 5, 'free_community')
    expect(r.faction).toBe('treasury')
    expect(r.fogLevel).toBe('hazy')
  })

  it('armStrength is higher on spine than near arm edge', () => {
    // At r=3 (exactly R_FLAT), no spiral offset — cell (0,3) is exactly on spine
    const spine = classifyCell(0, 3, 'free_community')
    // Cell (1,3): theta~71.6°, arm at 90°, angular dist ~19° → armStrength ~0.24
    const nearEdge = classifyCell(1, 3, 'free_community')
    expect(spine.armStrength).toBeGreaterThan(nearEdge.armStrength)
    expect(spine.armStrength).toBeGreaterThan(0.9)
  })

  it('returns own faction as clear, others as hazy', () => {
    const treasury = classifyCell(10, 0, 'treasury')
    expect(treasury.fogLevel).toBe('clear')
    const sameCell = classifyCell(10, 0, 'free_community')
    expect(sameCell.fogLevel).toBe('hazy')
  })

  it('classifies west cell (-5,0) as professional_pool clear for professional_pool user', () => {
    const r = classifyCell(-5, 0, 'professional_pool')
    expect(r.faction).toBe('professional_pool')
    expect(r.fogLevel).toBe('clear')
  })

  it('classifies origin as hazy for non-free_community user', () => {
    const r = classifyCell(0, 0, 'treasury')
    expect(r.fogLevel).toBe('hazy')
    expect(r.faction).toBe('free_community')
  })

  it('shows spiral offset at medium radius — N arm shifts CCW by ~18°', () => {
    // At r=15 (well past R_FLAT=3), the N arm has rotated CCW ~18.6°.
    // A cell at (0,15) [theta=90°] is no longer on the arm spine,
    // so armStrength should be noticeably less than 1.
    const onAxis = classifyCell(0, 15, 'free_community')
    // The N arm spine has shifted CCW from 90°, so armStrength < 0.99
    expect(onAxis.armStrength).toBeLessThan(0.99)
    // Still within ±25° so it stays on the arm
    expect(onAxis.faction).toBe('free_community')
  })

  it('flat-zone boundary r=R_FLAT (3) has no twist offset', () => {
    // At exactly r=3 (=R_FLAT), spiralOffset returns 0 — same as inner zone
    const r = classifyCell(0, 3, 'free_community')
    expect(r.faction).toBe('free_community')
    expect(r.armStrength).toBeGreaterThan(0.99)  // exactly on spine — no offset
  })
})
