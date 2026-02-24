// src/app/api/agent/route.ts
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { tokensToEnergy, totalTokens } from '@/lib/energy'
import type { AnthropicUsage, SubscriptionTier } from '@/lib/energy'
import { getAuthUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const client = new Anthropic()

const MAX_MESSAGES = 50

function isValidMessage(msg: unknown): boolean {
  if (!msg || typeof msg !== 'object') return false
  const m = msg as Record<string, unknown>
  if (typeof m.role !== 'string') return false
  if (typeof m.content !== 'string' && !Array.isArray(m.content)) return false
  return true
}

export async function POST(req: Request) {
  // Fix 1: Auth gate — reject unauthenticated callers
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { messages } = body

    // Fix 3: Validate messages
    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'messages must be an array' },
        { status: 400 },
      )
    }
    if (messages.length > MAX_MESSAGES) {
      return NextResponse.json(
        { error: `messages must not exceed ${MAX_MESSAGES} items` },
        { status: 400 },
      )
    }
    if (!messages.every(isValidMessage)) {
      return NextResponse.json(
        { error: 'Each message must have a string role and string or array content' },
        { status: 400 },
      )
    }

    // Fix 2: Read tier from the authenticated user's profile, not the request body
    const supabase = await createSupabaseServerClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('user_id', user.id)
      .single()

    // DB stores uppercase ('COMMUNITY'); energy.ts expects lowercase ('community')
    const rawTier = (profile?.subscription_tier ?? 'COMMUNITY') as string
    const tier = rawTier.toLowerCase() as SubscriptionTier

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
