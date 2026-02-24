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

  it('classifies inter-arm void as hidden', () => {
    // 45° = exactly between N arm (90°) and E arm (0°) at small r
    const r = classifyCell(5, 5, 'free_community')
    expect(r.faction).toBeNull()
    expect(r.fogLevel).toBe('hidden')
  })

  it('armStrength is higher on spine than near arm edge', () => {
    const spine = classifyCell(0, 10, 'free_community')
    const nearEdge = classifyCell(3, 10, 'free_community')
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

  it('shows spiral offset at large radius — N arm shifts CCW by >10°', () => {
    // At r=35 (just past R_FLAT=30), the N arm has rotated CCW ~11.7°.
    // A cell at exactly (0,35) [theta=90°] is no longer on the arm spine,
    // so armStrength should be noticeably less than 1 (not exactly on spine).
    const onAxis = classifyCell(0, 35, 'free_community')
    // The N arm spine has shifted CCW from 90°, so armStrength < 0.99
    expect(onAxis.armStrength).toBeLessThan(0.99)
    // But still within ±25° so it stays on the arm
    expect(onAxis.faction).toBe('free_community')
  })

  it('flat-zone boundary r=R_FLAT (30) has no twist offset', () => {
    // At exactly r=30, spiralOffset returns 0 — same as inner zone
    const r = classifyCell(0, 30, 'free_community')
    expect(r.faction).toBe('free_community')
    expect(r.armStrength).toBeGreaterThan(0.99)  // exactly on spine — no offset
  })
})
