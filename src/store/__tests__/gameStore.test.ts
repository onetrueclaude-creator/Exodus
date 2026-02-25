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

describe('gameStore — CPU Energy', () => {
  beforeEach(() => {
    useGameStore.getState().reset()
  })

  it('addCpuEnergy increases cpuTokens balance', () => {
    const store = useGameStore.getState()
    const before = store.cpuTokens
    store.addCpuEnergy(42)
    expect(useGameStore.getState().cpuTokens).toBe(before + 42)
  })
})

describe('gameStore — new resource setters', () => {
  beforeEach(() => {
    useGameStore.getState().reset()
  })

  it('setCpuTokens updates cpuTokens', () => {
    useGameStore.getState().setCpuTokens(999)
    expect(useGameStore.getState().cpuTokens).toBe(999)
  })

  it('setCpuStaked updates active and total', () => {
    useGameStore.getState().setCpuStaked(10, 50)
    const s = useGameStore.getState()
    expect(s.cpuStakedActive).toBe(10)
    expect(s.cpuStakedTotal).toBe(50)
  })

  it('setDevPoints updates devPoints', () => {
    useGameStore.getState().setDevPoints(42.5)
    expect(useGameStore.getState().devPoints).toBe(42.5)
  })

  it('setResearchPoints updates researchPoints', () => {
    useGameStore.getState().setResearchPoints(17.3)
    expect(useGameStore.getState().researchPoints).toBe(17.3)
  })

  it('setStorageSize updates storageSize', () => {
    useGameStore.getState().setStorageSize(100)
    expect(useGameStore.getState().storageSize).toBe(100)
  })

  it('setSubgridProjection updates all four projection fields', () => {
    useGameStore.getState().setSubgridProjection(1.5, 2.0, 0.5, 3.0)
    const s = useGameStore.getState()
    expect(s.subgridAgntcPerBlock).toBe(1.5)
    expect(s.subgridDevPerBlock).toBe(2.0)
    expect(s.subgridResearchPerBlock).toBe(0.5)
    expect(s.subgridStoragePerBlock).toBe(3.0)
  })

  it('new fields default to zero', () => {
    const s = useGameStore.getState()
    expect(s.cpuStakedActive).toBe(0)
    expect(s.cpuStakedTotal).toBe(0)
    expect(s.devPoints).toBe(0)
    expect(s.researchPoints).toBe(0)
    expect(s.storageSize).toBe(0)
    expect(s.subgridAgntcPerBlock).toBe(0)
    expect(s.subgridDevPerBlock).toBe(0)
    expect(s.subgridResearchPerBlock).toBe(0)
    expect(s.subgridStoragePerBlock).toBe(0)
  })
})
