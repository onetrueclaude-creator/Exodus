// src/app/api/agent/route.ts
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { tokensToEnergy, totalTokens } from '@/lib/energy'
import type { AnthropicUsage } from '@/lib/energy'

const client = new Anthropic()

export async function POST(req: Request) {
  try {
    const { messages, tier = 'community' } = await req.json()

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages,
    })

    const usage = response.usage as AnthropicUsage
    const tokens = totalTokens(usage)
    const energyEarned = tokensToEnergy(tokens, tier)

    return NextResponse.json({
      content: response.content,
      usage,
      tokens_total: tokens,
      energy_earned: energyEarned,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
