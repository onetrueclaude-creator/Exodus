import { createBrowserClient } from '@/lib/supabase/client'

export interface ResourceSnapshot {
  energy: number
  minerals: number
  agntc_balance: number
  secured_chains: number
  turn: number
}

/** Persist user resource balances to Supabase after meaningful game events. */
export async function persistResources(userId: string, resources: ResourceSnapshot): Promise<void> {
  try {
    const supabase = createBrowserClient()
    const { error } = await supabase
      .from('user_resources')
      .upsert({ user_id: userId, ...resources, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) {
      console.warn('[persistResources] failed:', error.message)
    }
  } catch (err) {
    console.warn('[persistResources] unexpected error:', err)
  }
}
