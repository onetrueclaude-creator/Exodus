export type SubscriptionTier = 'community' | 'professional' | 'max'

// All four fields from Anthropic API usage object
export interface AnthropicUsage {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
}

export const ENERGY_RATES: Record<SubscriptionTier, number> = {
  community:    0.01,   // 1 energy per 100 tokens
  professional: 0.02,   // 1 energy per 50 tokens
  max:          0.04,   // 1 energy per 25 tokens
}

/** Sum all four Anthropic usage fields — correct total tokens processed */
export function totalTokens(usage: AnthropicUsage): number {
  return (
    (usage.cache_read_input_tokens ?? 0) +
    (usage.cache_creation_input_tokens ?? 0) +
    usage.input_tokens +
    usage.output_tokens
  )
}

export function tokensToEnergy(tokens: number, tier: SubscriptionTier): number {
  return Math.floor(tokens * ENERGY_RATES[tier])
}
