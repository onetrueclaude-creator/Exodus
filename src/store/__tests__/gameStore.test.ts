import { useGameStore } from '@/store/gameStore'

describe('gameStore — userFaction', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useGameStore.getState().reset()
  })

  it('userFaction defaults to free_community', () => {
    const { userFaction } = useGameStore.getState()
    expect(userFaction).toBe('free_community')
  })

  it('setUserFaction updates faction', () => {
    useGameStore.getState().setUserFaction('treasury')
    expect(useGameStore.getState().userFaction).toBe('treasury')
    // reset back
    useGameStore.getState().setUserFaction('free_community')
    expect(useGameStore.getState().userFaction).toBe('free_community')
  })

  it('setUserFaction accepts all valid factions', () => {
    const factions = ['free_community', 'treasury', 'founder_pool', 'professional_pool'] as const
    for (const faction of factions) {
      useGameStore.getState().setUserFaction(faction)
      expect(useGameStore.getState().userFaction).toBe(faction)
    }
  })
})
