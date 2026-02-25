'use client'

import { useEffect } from 'react'
import { useGameStore } from '@/store/gameStore'

const WS_URL = 'ws://localhost:8080/ws'
const TESTNET_API = 'http://localhost:8080'
const RECONNECT_DELAY_MS = 5_000

/**
 * Connects to the Agentic Chain testnet WebSocket and dispatches live events
 * to the Zustand store. Only active when chainMode === 'testnet'.
 *
 * Handled events:
 *   block_mined  — flashes the block delta indicator, refreshes chain status
 */
export function useTestnetWebSocket() {
  const chainMode = useGameStore(s => s.chainMode)
  const setChainStatus = useGameStore(s => s.setChainStatus)
  const flashDelta = useGameStore(s => s.flashDelta)

  useEffect(() => {
    if (chainMode !== 'testnet') return

    let ws: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let destroyed = false

    function connect() {
      if (destroyed) return
      try {
        ws = new WebSocket(WS_URL)

        ws.onmessage = (event) => {
          try {
            const { event: type } = JSON.parse(event.data) as { event: string; data: unknown }
            if (type === 'block_mined') {
              // Flash +1 on the blocks counter
              flashDelta('blocks', 1)
              // Refresh full chain status from the REST API
              fetch(`${TESTNET_API}/api/status`)
                .then(r => r.json())
                .then(s => setChainStatus({
                  totalMined: s.total_mined,
                  stateRoot: s.state_root,
                  nextBlockIn: s.next_block_in,
                  blocks: s.blocks_processed,
                }))
                .catch(() => { /* status fetch failed — keep stale data */ })
            }
          } catch {
            // Malformed message — ignore
          }
        }

        ws.onerror = () => { /* connection errors handled by onclose */ }

        ws.onclose = () => {
          if (!destroyed) {
            reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS)
          }
        }
      } catch {
        if (!destroyed) {
          reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS)
        }
      }
    }

    connect()

    return () => {
      destroyed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      ws?.close()
    }
  }, [chainMode, setChainStatus, flashDelta])
}
