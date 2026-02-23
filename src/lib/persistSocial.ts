import { createBrowserClient } from '@/lib/supabase/client'
import type { Planet } from '@/types/agent'
import type { HaikuMessage } from '@/types/haiku'

export async function persistPlanet(planet: Planet, userId?: string): Promise<void> {
  try {
    const supabase = createBrowserClient()
    // Resolve userId: prefer explicit arg, then fall back to store's currentUserId
    let resolvedUserId = userId
    if (!resolvedUserId) {
      const { useGameStore } = await import('@/store/gameStore')
      resolvedUserId = useGameStore.getState().currentUserId ?? undefined
    }
    if (!resolvedUserId) {
      console.warn('[persistPlanet] skipped: no userId available')
      return
    }
    const { error } = await supabase.from('planets').insert({
      id: planet.id,
      agent_id: planet.agentId,
      user_id: resolvedUserId,
      content: planet.content,
      content_type: planet.contentType,
      is_zero_knowledge: planet.isZeroKnowledge,
      created_at: new Date(planet.createdAt).toISOString(),
    })
    if (error) console.warn('[persistPlanet] failed:', error.message)
  } catch (err) {
    console.warn('[persistPlanet] unexpected error:', err)
  }
}

export async function persistHaiku(haiku: HaikuMessage): Promise<void> {
  try {
    const supabase = createBrowserClient()
    const { error } = await supabase.from('haiku_messages').insert({
      id: haiku.id,
      sender_agent_id: haiku.senderAgentId,
      text: haiku.text,
      syllables: haiku.syllables,
      position_x: haiku.position.x,
      position_y: haiku.position.y,
      timestamp: haiku.timestamp,
    })
    if (error) console.warn('[persistHaiku] failed:', error.message)
  } catch (err) {
    console.warn('[persistHaiku] unexpected error:', err)
  }
}
