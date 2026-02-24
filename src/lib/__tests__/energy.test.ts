import { describe, it, expect } from 'vitest'
import { tokensToEnergy, totalTokens, ENERGY_RATES } from '@/lib/energy'
import type { AnthropicUsage } from '@/lib/energy'

describe('totalTokens', () => {
  it('sums all four usage fields', () => {
    const usage: AnthropicUsage = {
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_input_tokens: 200,
      cache_read_input_tokens: 1000,
    }
    expect(totalTokens(usage)).toBe(1350)
  })

  it('handles missing cache fields (non-cached response)', () => {
    const usage: AnthropicUsage = { input_tokens: 100, output_tokens: 50 }
    expect(totalTokens(usage)).toBe(150)
  })
})

describe('tokensToEnergy', () => {
  it('converts tokens to energy at community rate', () => {
    expect(tokensToEnergy(1000, 'community')).toBe(10)   // 1000 * 0.01
  })
  it('converts tokens to energy at professional rate', () => {
    expect(tokensToEnergy(1000, 'professional')).toBe(20)  // 1000 * 0.02
  })
  it('converts tokens to energy at max rate', () => {
    expect(tokensToEnergy(1000, 'max')).toBe(40)  // 1000 * 0.04
  })
  it('floors to integer', () => {
    expect(tokensToEnergy(50, 'community')).toBe(0)   // 50 * 0.01 = 0.5 → 0
    expect(tokensToEnergy(101, 'community')).toBe(1)
  })
})
