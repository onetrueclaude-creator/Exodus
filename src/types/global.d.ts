import type { useGameStore } from '@/store'

declare global {
  interface Window {
    __gameStore?: typeof useGameStore
  }
}

export {}
