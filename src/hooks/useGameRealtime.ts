'use client'

import { useEffect, useState } from 'react'
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
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const supabase = createBrowserClient()

    // Initial hydration from Supabase (single source of truth)
    async function hydrate() {
      try {
        // Race against a 5-second timeout so cert errors or slow connections
        // never block the game from rendering
        const deadline = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('hydration timeout')), 5_000)
        )

        type HydrateResult = [
          { data: ChainStatusRow | null; error: unknown },
          { data: AgentRow[] | null; error: unknown }
        ]
        const allPromise = Promise.all([
          supabase.from('chain_status').select('*').single() as unknown as Promise<{ data: ChainStatusRow | null; error: unknown }>,
          supabase.from('agents').select('*') as unknown as Promise<{ data: AgentRow[] | null; error: unknown }>,
        ]) as Promise<HydrateResult>

        const results = await Promise.race([allPromise, deadline]) as HydrateResult

        const [{ data: chainStatus }, { data: agents }] = results

        if (chainStatus) {
          setChainStatus({
            totalMined: chainStatus.total_mined,
            stateRoot: chainStatus.state_root,
            nextBlockIn: chainStatus.next_block_in,
            blocks: chainStatus.blocks_processed,
          })
        }

        if (agents) {
          agents.forEach(row => syncAgentFromChain(rowToStoreAgent(row)))
        }
      } catch {
        // Supabase unavailable — proceed with empty grid
      }

      // After Supabase hydrate, also fetch resource/epoch state from chain API
      try {
        const resResp = await fetch('http://localhost:8080/api/resources/0')
        if (resResp.ok) {
          const res = await resResp.json()
          const store = useGameStore.getState()
          store.setSubgridProjection(
            res.agntc_per_block ?? 0,
            res.dev_points_per_block ?? 0,
            res.research_points_per_block ?? 0,
            res.storage_per_block ?? 0,
          )
          store.setDevPoints(res.total_dev_points ?? 0)
          store.setResearchPoints(res.total_research_points ?? 0)
          store.setStorageSize(res.total_storage_units ?? 0)
        }
      } catch {
        // chain API unavailable — degrade gracefully
      } finally {
        setIsReady(true)
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
          if (payload.eventType === 'DELETE') return
          const row = payload.new as AgentRow
          syncAgentFromChain(rowToStoreAgent(row))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [setChainStatus, syncAgentFromChain])

  return { isReady }
}
