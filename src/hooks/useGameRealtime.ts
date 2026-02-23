'use client'

import { useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { useGameStore } from '@/store/gameStore'
import type { Database } from '@/lib/supabase/types'

type AgentRow = Database['public']['Tables']['agents']['Row']
type ChainStatusRow = Database['public']['Tables']['chain_status']['Row']

function rowToStoreAgent(row: AgentRow) {
  const tier = row.tier as 'haiku' | 'sonnet' | 'opus'
  return {
    id: row.id,
    userId: row.user_id ?? '',
    position: { x: row.visual_x, y: row.visual_y },
    tier,
    isPrimary: row.is_primary,
    planets: [],
    createdAt: new Date(row.synced_at).getTime(),
    username: row.username ?? undefined,
    bio: row.bio ?? undefined,
    introMessage: row.intro_message ?? undefined,
    borderRadius: row.border_radius,
    borderPressure: 0,
    cpuPerTurn: row.cpu_per_turn,
    miningRate: row.mining_rate,
    energyLimit: 100,
    stakedCpu: row.staked_cpu,
    parentAgentId: row.parent_agent_id ?? undefined,
    density: row.density,
    storageSlots: row.storage_slots,
  }
}

export function useGameRealtime() {
  const setChainStatus = useGameStore(s => s.setChainStatus)
  const syncAgentFromChain = useGameStore(s => s.syncAgentFromChain)

  useEffect(() => {
    const supabase = createBrowserClient()

    // Initial hydration from Supabase (single source of truth)
    async function hydrate() {
      const [{ data: chainStatus }, { data: agents }] = await Promise.all([
        supabase.from('chain_status').select('*').single(),
        supabase.from('agents').select('*'),
      ])

      if (chainStatus) {
        setChainStatus({
          poolRemaining: chainStatus.community_pool_remaining,
          totalMined: chainStatus.total_mined,
          stateRoot: chainStatus.state_root,
          nextBlockIn: chainStatus.next_block_in,
          blocks: chainStatus.blocks_processed,
        })
      }

      if (agents) {
        agents.forEach(row => syncAgentFromChain(rowToStoreAgent(row)))
      }
    }

    hydrate()

    // Realtime subscriptions — push updates from blockchain via Python → Supabase → Frontend
    const channel = supabase
      .channel('game-state')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chain_status' },
        (payload) => {
          const row = payload.new as ChainStatusRow
          setChainStatus({
            poolRemaining: row.community_pool_remaining,
            totalMined: row.total_mined,
            stateRoot: row.state_root,
            nextBlockIn: row.next_block_in,
            blocks: row.blocks_processed,
          })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agents' },
        (payload) => {
          const row = payload.new as AgentRow
          syncAgentFromChain(rowToStoreAgent(row))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [setChainStatus, syncAgentFromChain])
}
